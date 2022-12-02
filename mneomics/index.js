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
const fetched = require("./fetched.json");
const path = {
  BTC49: "m/49'/0'/0'/0/0",
  BTC84: "m/84'/0'/0'/0/0",
  BTC44: "m/44'/0'/0'/0/0",
};

const rateLimitReached = {
  0: false,
  1: false,
  2: false,
  3: false,
};

const numberOfRequests = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
};

let linesFetched = fetched.linesFetched;
let index = linesFetched;

const readMnemonic = async () => {
  const fileStream = fs.createReadStream("mnemonic.txt");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  //read the index from fetched.json
 let ix = 0;
  for await (const line of rl) {
    if (index > 0) {
      index--;
      continue;
    }
ix++;
console.log(`index: ${ix}`);
    
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
      console.log(`address: ${address}`);
      const apis = {
        //balance apis
        1: {
          id: 1,
          name: "blockchain",
          url: `https://blockchain.info/q/addressbalance/${address}`,
          rateLimit: 3400, //linit per hour
        },
        0: {
          id: 0,
          name: "blockcypher",
          url: `https://api.blockcypher.com/v1/btc/main/addrs/${address}`,
          rateLimit: 190, //linit per hour
        },
        2: {
          id: 2,
          name: "bitcoinchain",
          url: `https://api-r.bitcoinchain.com/v1/address/${address}`,
          rateLimit: 990, //linit per hour
        },
        3: {
          id: 3,
          name: "chainflyer",
          url: `https://chainflyer.bitflyer.jp/v1/address/${address}`,
          rateLimit: 990, //linit per hour
        },
      };

      //switch api if rate limit reached or response is not 200

      const getApi = () => {
        for (let i = 0; i < Object.keys(apis).length; i++) {
          if (rateLimitReached[i] === false) {
            return apis[i];
          }
        }
      };

      const api = getApi();

      console.log(`api: ${api.name}`);
      console.log(`url: ${api.url}`);
      const response = await fetch(api.url);
      if (response.status !== 200 || numberOfRequests[api.id] >= api.rateLimit) {
        rateLimitReached[api.id] = true;
        console.log(`rate limit reached for ${api.name}`);

        if (rateLimitReached[0] === true && rateLimitReached[1] === true && rateLimitReached[2] === true && rateLimitReached[3] === true) {
          console.log("all rate limits reached");
          for (let i = 0; i < Object.keys(apis).length; i++) {
            numberOfRequests[i] = 0;
            rateLimitReached[i] = false;
          }
        }

        return getBalance(address);
      }
      const data = await response.json();

      if (response.status === 200) {
        if (api.name === "blockcypher") {
          numberOfRequests[api.id] += 1;
          linesFetched++;
          fs.writeFileSync(
            "./fetched.json",
            JSON.stringify({ linesFetched: linesFetched/2 })
          );

          return data.balance;
        } else if (api.name === "blockchain") {
          numberOfRequests[api.id] += 1;
          linesFetched++;
          fs.writeFileSync(
            "./fetched.json",
            JSON.stringify({ linesFetched: linesFetched/2 })
          );

          return data;
        } else if (api.name === "bitcoinchain") {
          numberOfRequests[api.id] += 1;
          linesFetched++;
          fs.writeFileSync(
            "./fetched.json",
            JSON.stringify({ linesFetched: linesFetched/2 })
          );

          return data.balance;
        } else if (api.name === "chainflyer") {
          numberOfRequests[api.id] += 1;
          linesFetched++;
          fs.writeFileSync(
            "./fetched.json",
            JSON.stringify({ linesFetched: linesFetched/2 })
          );

          return data.confirmed_balance;
        }
      }

     
      return 0;
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
      console.log(`BTC49 balance: ${result.BTC49.balance}`);
      result.BTC84.balance = await getBalance(result.BTC84.address);
      console.log(`BTC84 balance: ${result.BTC84.balance}`);
      result.BTC44.balance = await getBalance(result.BTC44.address);
      console.log(`BTC44 balance: ${result.BTC44.balance}`);
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
    };

    await main();
  }
};

readMnemonic();
