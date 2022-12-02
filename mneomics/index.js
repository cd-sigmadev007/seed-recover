//recover BIP44 BTC Address  BIP49 BTC Address  BIP84 BTC Address  from BIP39 mnemonic

const bip39 = require("bip39");
const ecc = require("tiny-secp256k1");
const { BIP32Factory } = require("bip32");
const bip32 = BIP32Factory(ecc);
const bitcoin = require("bitcoinjs-lib");
const fs = require("fs");
const ObjectsToCsv = require("objects-to-csv");
const { read } = require("fs");
const readline = require("readline");
const path = {
  BTC49: "m/49'/0'/0'/0/0",
  BTC84: "m/84'/0'/0'/0/0",
  BTC44: "m/44'/0'/0'/0/0",
};

// const mnemonic = fs.readFileSync("mnemonic.txt", "utf8");

// read mnemonic line by line

const readMnemonic = async () => {
  const fileStream = fs.createReadStream("mnemonic.txt");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    console.log(`Line from file: ${line}`);
    const seed = bip39.mnemonicToSeedSync(line);
    const root = bip32.fromSeed(seed);
    const child = {
      BTC49: root.derivePath(path.BTC49),
      BTC84: root.derivePath(path.BTC84),
      BTC44: root.derivePath(path.BTC44),
    };

    const address = {
      BTC49: bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: child.BTC49.publicKey,
        }),
      }).address,
      BTC84: bitcoin.payments.p2wpkh({
        pubkey: child.BTC84.publicKey,
      }).address,
      
      BTC44: bitcoin.payments.p2pkh({
        pubkey: child.BTC44.publicKey,
      }).address,
    };

    const getBalance = async (address) => {
      const url = `https://blockchain.info/q/addressbalance/${address}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data !=0) {
        data = data / 100000000;
      }
      return data;
    };

    const result = {
      BTC49: {
        address: address.BTC49,
        balance: 0,
      },
      BTC84: {
        address: address.BTC84,
        balance: 0,
      },
      BTC44: {
        address: address.BTC44,
        balance: 0,
      },
    };

    const main = async () => {
      result.BTC49.balance = await getBalance(result.BTC49.address);
      result.BTC84.balance = await getBalance(result.BTC84.address);
      result.BTC44.balance = await getBalance(result.BTC44.address);
      const csv = new ObjectsToCsv([
        {
          mnemonic: line,
          BTC49: result.BTC49.address,
          BTC49_balance: result.BTC49.balance,
          BTC84: result.BTC84.address,
          BTC84_balance: result.BTC84.balance,

          BTC44: result.BTC44.address,
          BTC44_balance: result.BTC44.balance,
        },
        
      ]);
      await csv.toDisk("./result.csv", { append: true });
    }

    main();
  }
};

readMnemonic();

