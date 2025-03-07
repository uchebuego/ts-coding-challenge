import { Given, setDefaultTimeout, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  TokenId,
  TokenInfoQuery,
  TokenMintTransaction,
  Status,
  AccountInfoQuery,
  TransferTransaction,
  TokenAssociateTransaction,
} from "@hashgraph/sdk";
import assert from "node:assert";

setDefaultTimeout(60000);

const client = Client.forTestnet();

const state = {
  accountId: null as AccountId | null,
  accountPrivateKey: null as PrivateKey | null,
  treasuryKey: null as PrivateKey | null,
  tokenId: null as TokenId | null,
  fixedTokenId: null as TokenId | null,
  secondAccountId: null as AccountId | null,
  secondAccountPrivateKey: null as PrivateKey | null,
  thirdAccountId: null as AccountId | null,
  thirdAccountPrivateKey: null as PrivateKey | null,
  fourthAccountId: null as AccountId | null,
  fourthAccountPrivateKey: null as PrivateKey | null,
};

Given(
  /^A Hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    const account = accounts[0];
    state.accountId = AccountId.fromString(account.id);
    state.accountPrivateKey = PrivateKey.fromStringED25519(account.privateKey);
    state.treasuryKey = state.accountPrivateKey;
    client.setOperator(state.accountId, state.accountPrivateKey);

    const query = new AccountBalanceQuery().setAccountId(state.accountId);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  if (!state.treasuryKey || !state.accountId) {
    throw new Error("Treasury key or account ID is not set");
  }

  const tokenCreateTx = new TokenCreateTransaction({
    tokenName: "Test Token",
    tokenSymbol: "HTT",
    decimals: 2,
    tokenType: TokenType.FungibleCommon,
    treasuryAccountId: state.accountId,
    supplyKey: state.treasuryKey,
  }).freezeWith(client);

  let response = await tokenCreateTx.execute(client);
  let receipt = await response.getReceipt(client);

  state.tokenId = receipt.tokenId;

  console.log("Created token with ID: ", receipt.tokenId?.toString());
});

Then(/^The token has the name "([^"]*)"$/, async function (name) {
  if (!state.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: state.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.name, name);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (symbol) {
  if (!state.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: state.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.symbol, symbol);
});

Then(/^The token has (\d+) decimals$/, async function (decimals) {
  if (!state.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: state.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.decimals, decimals);
});

Then(/^The token is owned by the account$/, async function () {
  if (!state.tokenId || !state.accountId) {
    throw new Error("Token ID or account ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: state.tokenId,
  }).execute(client);

  assert.equal(
    tokenInfo.treasuryAccountId?.toString(),
    state.accountId.toString()
  );
});

Then(
  /^An attempt to mint (\d+) additional tokens succeeds$/,
  async function (amount) {
    if (!state.tokenId || !state.accountId) {
      throw new Error("Token ID or account ID is not set");
    }

    const tokenMintTx = new TokenMintTransaction({
      tokenId: state.tokenId,
      amount,
    }).freezeWith(client);

    let response = await tokenMintTx.execute(client);
    let receipt = await response.getReceipt(client);

    assert.equal(receipt.status, Status.Success);
  }
);

When(
  /^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (amount: number) {
    if (!state.treasuryKey || !state.accountId) {
      throw new Error("Treasury key or account ID is not set");
    }

    const tokenCreateTx = new TokenCreateTransaction({
      tokenName: "Test Token",
      tokenSymbol: "HTT",
      decimals: 2,
      tokenType: TokenType.FungibleCommon,
      treasuryAccountId: state.accountId,
      supplyType: TokenSupplyType.Finite,
      maxSupply: amount,
      initialSupply: amount,
    }).freezeWith(client);

    let response = await tokenCreateTx.execute(client);
    let receipt = await response.getReceipt(client);

    state.fixedTokenId = receipt.tokenId;

    console.log("Created token with ID: ", receipt.tokenId?.toString());
  }
);

Then(
  /^The total supply of the token is (\d+)$/,
  async function (amount: number) {
    if (!state.fixedTokenId) {
      throw new Error("Token ID is not set");
    }

    const tokenInfo = await new TokenInfoQuery({
      tokenId: state.fixedTokenId,
    }).execute(client);

    assert.equal(tokenInfo.totalSupply.toString(), amount.toString());
  }
);

Then(/^An attempt to mint tokens fails$/, async function () {
  if (!state.fixedTokenId || !state.accountId) {
    throw new Error("Token ID or account ID is not set");
  }

  const tokenMintTx = new TokenMintTransaction({
    tokenId: state.fixedTokenId,
    amount: 1,
  }).freezeWith(client);

  let response = await tokenMintTx.execute(client);

  assert.rejects(response.getReceipt(client));
});

Given(
  /^A first hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    if (!state.accountId) {
      throw new Error("Token ID or account ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: state.accountId,
    });

    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(/^A second Hedera account$/, async function () {
  const account = accounts[1];
  state.secondAccountId = AccountId.fromString(account.id);
  state.secondAccountPrivateKey = PrivateKey.fromStringED25519(
    account.privateKey
  );
});

Given(
  /^A token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (initialSupply: number) {
    if (!state.fixedTokenId) {
      throw new Error("Fixed token is not set");
    }

    const tokenInfo = await new TokenInfoQuery({
      tokenId: state.fixedTokenId,
    }).execute(client);

    assert.equal(tokenInfo.totalSupply.toString(), initialSupply.toString());
    assert.equal(tokenInfo.symbol, "HTT");
    assert.equal(tokenInfo.name, "Test Token");
  }
);

Given(
  /^The first account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (
      !state.fixedTokenId ||
      !state.accountId ||
      !state.accountPrivateKey ||
      !state.secondAccountId
    ) {
      throw new Error(
        "Token ID, account ID, or account private key is not set"
      );
    }

    const query = new AccountBalanceQuery({
      accountId: state.accountId,
    });

    const balance = await query.execute(client);

    const b = balance.tokens?.get(state.fixedTokenId);

    assert.ok(balance.tokens?.get(state.fixedTokenId).toNumber() > amount);
  }
);

Given(
  /^The second account holds (\d+) HTT tokens$/,
  async function (tokenAmount: number) {
    if (
      !state.fixedTokenId ||
      !state.accountId ||
      !state.secondAccountPrivateKey ||
      !state.secondAccountId
    ) {
      throw new Error(
        "Token ID, account ID, or account private key is not set"
      );
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: state.secondAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(state.fixedTokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [state.fixedTokenId],
        accountId: state.secondAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(state.secondAccountPrivateKey);

      const assocResponse = await signTx.execute(client);
      const assocReceipt = await assocResponse.getReceipt(client);
    }

    const accountBalanceQuery = new AccountBalanceQuery({
      accountId: state.secondAccountId,
    });

    const balance = await accountBalanceQuery.execute(client);

    console.log(
      balance.tokens?.get(state.fixedTokenId)?.toNumber(),
      tokenAmount
    );

    assert.ok(
      balance.tokens?.get(state.fixedTokenId)?.toNumber() === tokenAmount
    );
  }
);

When(
  /^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/,
  async function (amount: number) {
    console.log({ amount });

    if (!state.fixedTokenId || !state.accountId || !state.secondAccountId) {
      throw new Error("Token ID or account IDs are not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: state.fixedTokenId,
          amount: -amount,
          accountId: state.accountId,
        },
        {
          tokenId: state.fixedTokenId,
          amount: amount,
          accountId: state.secondAccountId,
        },
      ],
    }).freezeWith(client);

    let response = await transaction.execute(client);
    let receipt = await response.getReceipt(client);

    assert.equal(receipt.status, Status.Success);
  }
);

When(/^The first account submits the transaction$/, async function () {});

When(
  /^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/,
  async function (amount: number) {
    if (
      !state.fixedTokenId ||
      !state.accountId ||
      !state.secondAccountId ||
      !state.secondAccountPrivateKey
    ) {
      throw new Error("Token ID, account IDs, or private key is not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: state.fixedTokenId,
          amount: -amount,
          accountId: state.secondAccountId,
        },
        {
          tokenId: state.fixedTokenId,
          amount: amount,
          accountId: state.accountId,
        },
      ],
    }).freezeWith(client);

    const signTx = await transaction.sign(state.secondAccountPrivateKey);
    let response = await signTx.execute(client);
    let receipt = await response.getReceipt(client);

    assert.equal(receipt.status, Status.Success);
  }
);

Then(/^The first account has paid for the transaction fee$/, async function () {
  if (!state.accountId) {
    throw new Error("Account ID is not set");
  }

  const accountInfo = await new AccountInfoQuery({
    accountId: state.accountId,
  }).execute(client);

  assert.ok(accountInfo.isDeleted === false);
});

Given(
  /^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    if (!state.accountId || !state.fixedTokenId) {
      throw new Error("Account ID or token ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: state.accountId,
    });

    const balance = await query.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() > hbarAmount);
    assert.ok(
      balance.tokens?.get(state.fixedTokenId)?.toBigNumber().toNumber() >=
        tokenAmount
    );
  }
);

Given(
  /^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    if (!state.secondAccountId || !state.fixedTokenId) {
      throw new Error("Second account ID or token ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: state.secondAccountId,
    });

    const balance = await query.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() >= hbarAmount);
    assert.ok(
      balance.tokens?.get(state.fixedTokenId)?.toBigNumber().toNumber() >=
        tokenAmount
    );
  }
);

Given(
  /^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const account = accounts[2];
    state.thirdAccountId = AccountId.fromString(account.id);
    state.thirdAccountPrivateKey = PrivateKey.fromStringED25519(
      account.privateKey
    );

    if (!state.fixedTokenId) {
      throw new Error("Token ID is not set");
    }

    const tx = new TokenAssociateTransaction({
      tokenIds: [state.fixedTokenId],
      accountId: state.thirdAccountId,
    }).freezeWith(client);

    const signTx = await tx.sign(state.thirdAccountPrivateKey);
    await (await signTx.execute(client)).getReceipt(client);

    const query = new AccountBalanceQuery({
      accountId: state.thirdAccountId,
    });

    const balance = await query.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() >= hbarAmount);
  }
);

Given(
  /^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const account = accounts[3];
    state.fourthAccountId = AccountId.fromString(account.id);
    state.fourthAccountPrivateKey = PrivateKey.fromStringED25519(
      account.privateKey
    );

    if (!state.fixedTokenId) {
      throw new Error("Token ID is not set");
    }

    const tx = new TokenAssociateTransaction({
      tokenIds: [state.fixedTokenId],
      accountId: state.fourthAccountId,
    }).freezeWith(client);

    const signTx = await tx.sign(state.fourthAccountPrivateKey);
    await (await signTx.execute(client)).getReceipt(client);

    const query = new AccountBalanceQuery({
      accountId: state.fourthAccountId,
    });

    const balance = await query.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() >= hbarAmount);
  }
);

When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function (amount1: number, amount3: number, amount4: number) {
    if (
      !state.fixedTokenId ||
      !state.accountId ||
      !state.secondAccountId ||
      !state.thirdAccountId ||
      !state.fourthAccountId ||
      !state.accountPrivateKey ||
      !state.secondAccountPrivateKey
    ) {
      throw new Error("Required accounts or token information is not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: state.fixedTokenId,
          amount: -amount1,
          accountId: state.accountId,
        },
        {
          tokenId: state.fixedTokenId,
          amount: -amount1,
          accountId: state.secondAccountId,
        },
        {
          tokenId: state.fixedTokenId,
          amount: amount3,
          accountId: state.thirdAccountId,
        },
        {
          tokenId: state.fixedTokenId,
          amount: amount4,
          accountId: state.fourthAccountId,
        },
      ],
    }).freezeWith(client);

    // Sign with both sending accounts
    let signTx = await transaction.sign(state.accountPrivateKey);
    signTx = await signTx.sign(state.secondAccountPrivateKey);

    let response = await signTx.execute(client);
    let receipt = await response.getReceipt(client);

    assert.equal(receipt.status, Status.Success);
  }
);

Then(
  /^The third account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (!state.fixedTokenId || !state.thirdAccountId) {
      throw new Error("Token ID or third account ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: state.thirdAccountId,
    });

    const balance = await query.execute(client);

    assert.equal(
      balance.tokens?.get(state.fixedTokenId)?.toBigNumber().toNumber(),
      amount
    );
  }
);

Then(
  /^The fourth account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (!state.fixedTokenId || !state.fourthAccountId) {
      throw new Error("Token ID or fourth account ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: state.fourthAccountId,
    });

    const balance = await query.execute(client);

    assert.equal(
      balance.tokens?.get(state.fixedTokenId)?.toBigNumber().toNumber(),
      amount
    );
  }
);
