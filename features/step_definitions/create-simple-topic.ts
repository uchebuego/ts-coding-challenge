import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  RequestType,
  TopicCreateTransaction,
  TopicInfoQuery,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
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

    const topicId = topicCreateTxReceipt.topicId;
    console.log("topicId:", topicId?.toString());
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (message: string) {}
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (message: string) {}
);

Given(/^A second account with more than (\d+) hbars$/, async function () {});

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function () {}
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function () {}
);
