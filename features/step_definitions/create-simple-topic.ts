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
  TopicId,
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;

const client = Client.forTestnet();

const state = {
  accountId: null as AccountId | null,
  accountPrivateKey: null as PrivateKey | null,
  secondAccountId: null as AccountId | null,
  secondAccountPrivateKey: null as PrivateKey | null,
  topicId: null as TopicId | null,
  thresholdAccountId: null as AccountId | null,
  thresholdKey: null as KeyList | null,
};

Given(
  /^a first account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    // const acc = accounts[0];
    // const account: AccountId = AccountId.fromString(acc.id);
    // state.accountId = account;
    // const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
    // state.accountPrivateKey = privKey;
    // client.setOperator(state.accountId, privKey);
    // //Create the query request
    // const query = new AccountBalanceQuery().setAccountId(account);
    // const balance = await query.execute(client);
    // assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the first account as the submit key$/,
  async function (memo: string) {
    // if (!state.accountPrivateKey) {
    //   throw new Error("Account private key is not set");
    // }
    // const topicCreateTx = new TopicCreateTransaction({
    //   topicMemo: memo,
    // }).freezeWith(client);
    // const topicCreateTxSubmitted = await topicCreateTx.execute(client);
    // const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
    //   client
    // );
    // state.topicId = topicCreateTxReceipt.topicId;
    // if (!state.topicId) {
    //   throw new Error("Failed to create topic: No topic ID returned");
    // }
    // console.log("Topic Created:", state.topicId.toString());
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (message: string) {
    // if (!state.topicId) {
    //   throw new Error("No Topic ID found");
    // }
    // const topicMsgSubmitTx = new TopicMessageSubmitTransaction({
    //   message,
    //   topicId: state.topicId,
    // }).freezeWith(client);
    // const response = await topicMsgSubmitTx.execute(client);
    // const receipt = await response.getReceipt(client);
    // console.log("Message published to topic: ", message);
  }
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (message: string) {
    // if (!state.topicId) {
    //   throw new Error("No Topic ID found");
    // }
    // return new Promise((resolve, reject) => {
    //   const timeout = setTimeout(() => {
    //     subscription.unsubscribe();
    //     reject(new Error("Timeout waiting for message"));
    //   }, 4000);
    //   const subscription = new TopicMessageQuery()
    //     .setTopicId(state.topicId!)
    //     .setStartTime(0)
    //     .subscribe(
    //       client,
    //       (error) => {
    //         clearTimeout(timeout);
    //         subscription.unsubscribe();
    //         reject(error);
    //       },
    //       (msg) => {
    //         const messageContent = Buffer.from(msg.contents).toString();
    //         console.log("Message received by Topic: ", messageContent);
    //         if (messageContent === message) {
    //           clearTimeout(timeout);
    //           subscription.unsubscribe();
    //           assert.strictEqual(messageContent, message);
    //           resolve(true);
    //         }
    //       }
    //     );
    // });
  }
);

Given(
  /^A second account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    // const acc = accounts[1];
    // const account: AccountId = AccountId.fromString(acc.id);
    // state.secondAccountId = account;
    // const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
    // state.secondAccountPrivateKey = privKey;
    // const query = new AccountBalanceQuery().setAccountId(account);
    // const balance = await query.execute(client);
    // assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function (threshold: number, total: number) {
    // if (!state.accountPrivateKey || !state.secondAccountPrivateKey) {
    //   throw new Error("Account private keys are not set");
    // }
    // state.thresholdKey = new KeyList(
    //   [
    //     state.accountPrivateKey.publicKey,
    //     state.secondAccountPrivateKey.publicKey,
    //   ],
    //   threshold
    // );
    // const transaction = new AccountCreateTransaction({
    //   key: state.thresholdKey,
    //   initialBalance: 10,
    // }).freezeWith(client);
    // const response = await transaction.execute(client);
    // const receipt = await response.getReceipt(client);
    // state.thresholdAccountId = receipt.accountId;
    // if (!state.thresholdAccountId) {
    //   throw new Error(
    //     "Failed to create threshold account: No account ID returned"
    //   );
    // }
    // console.log("Threshold Account ID:", state.thresholdAccountId.toString());
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function (memo: string) {
    // if (!state.accountPrivateKey || !state.secondAccountPrivateKey) {
    //   throw new Error("Account private keys are not set");
    // }
    // const topicCreateTx = new TopicCreateTransaction({ topicMemo: memo })
    //   .setNodeAccountIds([new AccountId(3)])
    //   .freezeWith(client);
    // const sig1 = state.accountPrivateKey.signTransaction(topicCreateTx);
    // const sig2 = state.secondAccountPrivateKey.signTransaction(topicCreateTx);
    // const signedTransaction = topicCreateTx
    //   .addSignature(state.accountPrivateKey.publicKey, sig1)
    //   .addSignature(state.secondAccountPrivateKey.publicKey, sig2);
    // const topicCreateTxSubmitted = await signedTransaction.execute(client);
    // const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
    //   client
    // );
    // if (!topicCreateTxReceipt.topicId) {
    //   throw new Error(
    //     "Failed to create topic with threshold key: No topic ID returned"
    //   );
    // }
    // console.log(
    //   "Threshold Key used to create Topic:",
    //   topicCreateTxReceipt.topicId.toString()
    // );
  }
);
