import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import kp from './keypair.json';

import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import idl from './idl.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  async function checkIfWalletIsConnected() {
    try {
      const { solana } = window || {};
      if (!solana.isPhantom) {
        console.log('no wallet');
        return;
      }
      console.log('Found');
      const response = await solana.connect({ onlyIfTrusted: true });

      const connectedWalletAddress = response.publicKey.toString();

      console.log(
        'Connected with Public Key:',
        connectedWalletAddress
      );

      setWalletAddress(connectedWalletAddress);

    } catch (error) {
      console.error(error);
    }
  }
  
  async function connectWallet() {
    console.log('connect');
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      const connectedWalletAddress = response.publicKey.toString();
      console.log('connected', connectedWalletAddress);
      setWalletAddress(connectedWalletAddress);
    }
  }

  function getProvider() {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  async function getGifList() {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifs: ", error)
      setGifList(null);
    }
  }

  async function createGifAccount() {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  useEffect(() => {
    async function onLoad() {
      await checkIfWalletIsConnected();
    }
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    getGifList();
  }, [walletAddress]);

  function renderNotConnectedContainer() {
    return (
      <button
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
        Connect to Wallet
      </button>
    );
  }

  function onInputChange(event) {
    const { value } = event.target;
    setInputValue(value);
  }

  async function sendGif() {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF sucesfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  }

  async function vote(gifLink) {
     try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.vote(gifLink, {
        accounts: {
          baseAccount: baseAccount.publicKey,
        },
      });
      console.log(gifLink, "voted");

      await getGifList();
    } catch (error) {
      console.log("Error voting GIF:", error)
    }
  }

  function renderConnectedContainer() {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } 
    
    console.log(gifList);

    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input 
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">Submit</button>
        </form>
        <div className="gif-grid">
          {gifList.map(({ gifLink, userAddress, votes }) => (
            <div className="gif-item" key={gifLink}>
              <img src={gifLink} alt={gifLink} />
              <p className="gif-owner">Owner: {userAddress.toString()}</p>
              <div className="votes-section">
                <span>Votes: {votes}</span>
                <button onClick={() => vote(gifLink)}>👍</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Dancing memes gif portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {walletAddress ? renderConnectedContainer() : renderNotConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
}