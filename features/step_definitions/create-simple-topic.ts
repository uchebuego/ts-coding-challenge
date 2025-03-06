import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  KeyList,
  PrivateKey,
  RequestType,
  TopicCreateTransaction,
  TopicInfoQuery,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
  AccountCreateTransaction,
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;

// Pre-configured client for test network (testnet)
const client = Client.forTestnet();

//Set the operator with the account ID and private key

Given(
  /^a first account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    const acc = accounts[0];
    const account: AccountId = AccountId.fromString(acc.id);
    this.account = account;
    const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
    this.privKey = privKey;
    client.setOperator(this.account, privKey);

    //Create the query request
    const query = new AccountBalanceQuery().setAccountId(account);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the first account as the submit key$/,
  async function (memo: string) {
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .freezeWith(client);

    const topicCreateTxId = topicCreateTx.transactionId;

    console.log(
      "The topic create transaction ID: ",
      topicCreateTxId?.toString()
    );

    const topicCreateTxSigned = await topicCreateTx.sign(this.privKey);

    const topicCreateTxSubmitted = await topicCreateTxSigned.execute(client);

    const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
      client
    );

    this.topicId = topicCreateTxReceipt.topicId;
    console.log("topicId:", this.topicId?.toString());
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (message: string) {
    const topicMsgSubmitTx = new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message)
      .freezeWith(client);

    const topicMsgSubmitTxId = topicMsgSubmitTx.transactionId;

    console.log(
      "The message submit create transaction ID: ",
      topicMsgSubmitTxId?.toString()
    );

    const topicMsgSubmitTxSigned = await topicMsgSubmitTx.sign(this.privKey);

    const topicMsgSubmitTxSubmitted = await topicMsgSubmitTxSigned.execute(
      client
    );

    const topicMsgSubmitTxReceipt = await topicMsgSubmitTxSubmitted.getReceipt(
      client
    );

    const topicMsgSeqNum = topicMsgSubmitTxReceipt.topicSequenceNumber;
    console.log("topicMsgSeqNum:", topicMsgSeqNum.toString());
  }
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (message: string) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error("Timeout waiting for message"));
      }, 4000);

      const subscription = new TopicMessageQuery()
        .setTopicId(this.topicId)
        .setStartTime(0)
        .subscribe(
          client,
          (error) => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            reject(error);
          },
          (msg) => {
            const messageContent = Buffer.from(msg.contents).toString();
            console.log("messageContent: ", messageContent);

            if (messageContent === message) {
              clearTimeout(timeout);
              subscription.unsubscribe();
              assert.strictEqual(messageContent, message);
              resolve(true);
            }
          }
        );
    });
  }
);

Given(
  /^A second account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    const acc = accounts[1];
    const account: AccountId = AccountId.fromString(acc.id);
    this.account = account;
    const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
    this.privKey2 = privKey;

    const query = new AccountBalanceQuery().setAccountId(account);
    const balance = await query.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function (threshold: number, total: number) {
    this.thresholdKey = new KeyList(
      [this.privKey.publicKey, this.privKey2.publicKey],
      threshold
    );

    const transaction = new AccountCreateTransaction()
      .setKey(this.thresholdKey)
      .setInitialBalance(1000);

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);
    const newAccountId = receipt.accountId;

    console.log("New Account ID with Threshold Key:", newAccountId?.toString());
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function (memo: string) {
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .freezeWith(client);

    const topicCreateTxId = topicCreateTx.transactionId;

    console.log(
      "Threshold Key topic create transaction ID: ",
      topicCreateTxId?.toString()
    );

    const topicCreateTxSigned = await topicCreateTx.sign(this.thresholdKey);

    const topicCreateTxSubmitted = await topicCreateTxSigned.execute(client);

    const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
      client
    );

    this.topicId = topicCreateTxReceipt.topicId;
    console.log("topicId:", this.topicId?.toString());
  }
);
