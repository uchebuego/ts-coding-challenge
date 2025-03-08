import { Given, Then, When, Before } from "@cucumber/cucumber";
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
  TransferTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;

const client = Client.forTestnet();

Before(async function (this: any) {
  const acc = accounts[0];
  this.treasuryAccountId = AccountId.fromString(acc.id);
  this.treasuryPrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  client.setOperator(this.treasuryAccountId, this.treasuryPrivateKey);
});

Given(
  /^a first account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    const firstAccountPrivateKey = PrivateKey.generateED25519();
    const firstAccountPublicKey = firstAccountPrivateKey.publicKey;

    const firstAccountTx = await new AccountCreateTransaction()
      .setKey(firstAccountPublicKey)
      .execute(client);

    const firstAccountReceipt = await firstAccountTx.getReceipt(client);
    this.firstAccountId = firstAccountReceipt.accountId;
    this.firstAccountPrivateKey = firstAccountPrivateKey;

    const transaction = new TransferTransaction()
      .addHbarTransfer(this.treasuryAccountId, new Hbar(-(expectedBalance + 1)))
      .addHbarTransfer(this.firstAccountId, new Hbar(expectedBalance + 1))
      .freezeWith(client);

    const response = await transaction.execute(client);
    await response.getReceipt(client);

    const query = new AccountBalanceQuery().setAccountId(this.firstAccountId);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the first account as the submit key$/,
  async function (memo: string) {
    const topicCreateTx = new TopicCreateTransaction({
      topicMemo: memo,
    }).freezeWith(client);
    const topicCreateTxSubmitted = await topicCreateTx.execute(client);
    const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
      client
    );

    this.topicId = topicCreateTxReceipt.topicId;

    if (!this.topicId) {
      throw new Error("Failed to create topic: No topic ID returned");
    }
    console.log("Topic Created:", this.topicId.toString());
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (message: string) {
    if (!this.topicId) {
      throw new Error("No Topic ID found");
    }
    const topicMsgSubmitTx = new TopicMessageSubmitTransaction({
      message,
      topicId: this.topicId,
    }).freezeWith(client);
    const response = await topicMsgSubmitTx.execute(client);
    const receipt = await response.getReceipt(client);
    console.log("Message published to topic: ", message);
  }
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (message: string) {
    if (!this.topicId) {
      throw new Error("No Topic ID found");
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error("Timeout waiting for message"));
      }, 4000);
      const subscription = new TopicMessageQuery()
        .setTopicId(this.topicId!)
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
            console.log("Message received by Topic: ", messageContent);
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
    const secondAccountPrivateKey = PrivateKey.generateED25519();
    const secondAccountPublicKey = secondAccountPrivateKey.publicKey;

    const secondAccountTx = await new AccountCreateTransaction()
      .setKey(secondAccountPublicKey)
      .execute(client);

    const secondAccountReceipt = await secondAccountTx.getReceipt(client);
    this.secondAccountId = secondAccountReceipt.accountId;
    this.secondAccountPrivateKey = secondAccountPrivateKey;

    const transaction = new TransferTransaction()
      .addHbarTransfer(this.treasuryAccountId, new Hbar(-(expectedBalance + 1)))
      .addHbarTransfer(this.secondAccountId, new Hbar(expectedBalance + 1))
      .freezeWith(client);

    const response = await transaction.execute(client);
    await response.getReceipt(client);

    const query = new AccountBalanceQuery().setAccountId(this.secondAccountId);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function (threshold: number, total: number) {
    this.thresholdKey = new KeyList(
      [
        this.firstAccountPrivateKey.publicKey,
        this.secondAccountPrivateKey.publicKey,
      ],
      threshold
    );
    const transaction = new AccountCreateTransaction({
      key: this.thresholdKey,
      initialBalance: 10,
    }).freezeWith(client);
    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);
    this.thresholdAccountId = receipt.accountId;
    if (!this.thresholdAccountId) {
      throw new Error(
        "Failed to create threshold account: No account ID returned"
      );
    }
    console.log("Threshold Account ID:", this.thresholdAccountId.toString());
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function (memo: string) {
    const topicCreateTx = new TopicCreateTransaction({ topicMemo: memo })
      .setNodeAccountIds([new AccountId(3)])
      .freezeWith(client);
    const sig1 = this.firstAccountPrivateKey.signTransaction(topicCreateTx);
    const sig2 = this.secondAccountPrivateKey.signTransaction(topicCreateTx);
    const signedTransaction = topicCreateTx
      .addSignature(this.firstAccountPrivateKey.publicKey, sig1)
      .addSignature(this.secondAccountPrivateKey.publicKey, sig2);
    const topicCreateTxSubmitted = await signedTransaction.execute(client);
    const topicCreateTxReceipt = await topicCreateTxSubmitted.getReceipt(
      client
    );
    if (!topicCreateTxReceipt.topicId) {
      throw new Error(
        "Failed to create topic with threshold key: No topic ID returned"
      );
    }
    console.log(
      "Threshold Key used to create Topic:",
      topicCreateTxReceipt.topicId.toString()
    );
    this.topicId = topicCreateTxReceipt.topicId;
  }
);
