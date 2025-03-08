import {
  Given,
  setDefaultTimeout,
  Then,
  When,
  Before,
} from "@cucumber/cucumber";
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
  Hbar,
  AccountCreateTransaction,
} from "@hashgraph/sdk";
import assert from "node:assert";

setDefaultTimeout(60000);

const client = Client.forTestnet();

interface CucumberContext {
  treasuryAccountId: AccountId;
  treasuryPrivateKey: PrivateKey;
  firstAccountId: AccountId | null;
  firstAccountPrivateKey: PrivateKey | null;
  tokenId: TokenId | null;
  secondAccountId: AccountId | null;
  secondAccountPrivateKey: PrivateKey | null;
  thirdAccountId: AccountId | null;
  thirdAccountPrivateKey: PrivateKey | null;
  fourthAccountId: AccountId | null;
  fourthAccountPrivateKey: PrivateKey | null;
  pendingTx: TransferTransaction | null;
}

Before(async function (this: CucumberContext) {
  this.treasuryAccountId = AccountId.fromString(accounts[0].id);
  this.treasuryPrivateKey = PrivateKey.fromStringED25519(
    accounts[0].privateKey
  );

  client.setOperator(this.treasuryAccountId, this.treasuryPrivateKey);
});

Given(
  /^A Hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    this.treasuryAccountId = AccountId.fromString(accounts[0].id);
    this.treasuryPrivateKey = PrivateKey.fromStringED25519(
      accounts[0].privateKey
    );
    client.setOperator(this.treasuryAccountId, this.treasuryPrivateKey);

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
  /^I create a token named Test Token \(HTT\)$/,
  async function (this: CucumberContext) {
    if (!this.firstAccountId || !this.firstAccountPrivateKey) {
      throw new Error("Account ID or private key is not set");
    }

    const tokenCreateTx = new TokenCreateTransaction({
      tokenName: "Test Token",
      tokenSymbol: "HTT",
      decimals: 2,
      tokenType: TokenType.FungibleCommon,
      treasuryAccountId: this.treasuryAccountId,
      supplyKey: this.treasuryPrivateKey,
    }).freezeWith(client);

    let response = await tokenCreateTx.execute(client);
    let receipt = await response.getReceipt(client);

    this.tokenId = receipt.tokenId;

    console.log("Created token with ID: ", receipt.tokenId?.toString());
  }
);

Then(/^The token has the name "([^"]*)"$/, async function (name) {
  if (!this.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: this.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.name, name);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (symbol) {
  if (!this.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: this.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.symbol, symbol);
});

Then(/^The token has (\d+) decimals$/, async function (decimals) {
  if (!this.tokenId) {
    throw new Error("Token ID is not set");
  }

  const tokenInfo = await new TokenInfoQuery({
    tokenId: this.tokenId,
  }).execute(client);

  assert.equal(tokenInfo.decimals, decimals);
});

Then(
  /^The token is owned by the account$/,
  async function (this: CucumberContext) {
    if (!this.tokenId || !this.firstAccountId) {
      throw new Error("Token ID or account ID is not set");
    }

    const tokenInfo = await new TokenInfoQuery({
      tokenId: this.tokenId,
    }).execute(client);

    assert.equal(
      tokenInfo.treasuryAccountId?.toString(),
      this.treasuryAccountId.toString()
    );
  }
);

Then(
  /^An attempt to mint (\d+) additional tokens succeeds$/,
  async function (amount) {
    if (!this.tokenId || !this.firstAccountId) {
      throw new Error("Token ID or account ID is not set");
    }

    const tokenMintTx = new TokenMintTransaction({
      tokenId: this.tokenId,
      amount,
    }).freezeWith(client);

    let response = await tokenMintTx.execute(client);
    let receipt = await response.getReceipt(client);

    assert.equal(receipt.status, Status.Success);
  }
);

When(
  /^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (this: CucumberContext, amount: number) {
    if (!this.treasuryAccountId) {
      throw new Error("Account ID is not set");
    }

    const tokenCreateTx = new TokenCreateTransaction({
      tokenName: "Test Token",
      tokenSymbol: "HTT",
      decimals: 2,
      tokenType: TokenType.FungibleCommon,
      treasuryAccountId: this.treasuryAccountId,
      supplyType: TokenSupplyType.Finite,
      maxSupply: amount,
      initialSupply: amount,
    }).freezeWith(client);

    let response = await tokenCreateTx.execute(client);
    let receipt = await response.getReceipt(client);

    this.tokenId = receipt.tokenId;

    console.log("Created token with ID: ", receipt.tokenId?.toString());
  }
);

Then(
  /^The total supply of the token is (\d+)$/,
  async function (amount: number) {
    if (!this.tokenId) {
      throw new Error("Token ID is not set");
    }

    const tokenInfo = await new TokenInfoQuery({
      tokenId: this.tokenId,
    }).execute(client);

    assert.equal(tokenInfo.totalSupply.toString(), amount.toString());
  }
);

Then(/^An attempt to mint tokens fails$/, async function () {
  if (!this.tokenId || !this.firstAccountId) {
    throw new Error("Token ID or account ID is not set");
  }

  const tokenMintTx = new TokenMintTransaction({
    tokenId: this.tokenId,
    amount: 1,
  }).freezeWith(client);

  let response = await tokenMintTx.execute(client);

  assert.rejects(response.getReceipt(client));
});

Given(
  /^A first hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    this.treasuryAccountId = AccountId.fromString(accounts[0].id);
    this.treasuryPrivateKey = PrivateKey.fromStringED25519(
      accounts[0].privateKey
    );
    client.setOperator(this.treasuryAccountId, this.treasuryPrivateKey);

    const firstAccountPrivateKey = PrivateKey.generateED25519();
    const firstAccountPublicKey = firstAccountPrivateKey.publicKey;

    const firstAccountTx = await new AccountCreateTransaction()
      .setKey(firstAccountPublicKey)
      .execute(client);

    const firstAccountReceipt = await firstAccountTx.getReceipt(client);

    this.firstAccountId = firstAccountReceipt.accountId!;
    this.firstAccountPrivateKey = firstAccountPrivateKey;

    const transaction = new TransferTransaction()
      .addHbarTransfer(this.treasuryAccountId, new Hbar(-(expectedBalance + 1)))
      .addHbarTransfer(this.firstAccountId, new Hbar(expectedBalance + 1))
      .freezeWith(client);

    const response = await transaction.execute(client);
    await response.getReceipt(client);

    const query = new AccountBalanceQuery({
      accountId: this.firstAccountId,
    });

    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(/^A second Hedera account$/, async function () {
  const secondAccountPrivateKey = PrivateKey.generateED25519();
  const secondAccountPublicKey = secondAccountPrivateKey.publicKey;

  const secondAccountTx = await new AccountCreateTransaction()
    .setKey(secondAccountPublicKey)
    .execute(client);

  const secondAccountReceipt = await secondAccountTx.getReceipt(client);
  this.secondAccountId = secondAccountReceipt.accountId!;
  this.secondAccountPrivateKey = secondAccountPrivateKey;

  if (!this.secondAccountId || !this.secondAccountPrivateKey) {
    throw new Error("Second account was not properly initialized");
  }
});

Given(
  /^A token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (this: CucumberContext, initialSupply: number) {
    if (!this.treasuryAccountId) {
      throw new Error("Account ID is not set");
    }

    const tokenCreateTx = new TokenCreateTransaction({
      tokenName: "Test Token",
      tokenSymbol: "HTT",
      decimals: 2,
      tokenType: TokenType.FungibleCommon,
      treasuryAccountId: this.treasuryAccountId,
      supplyType: TokenSupplyType.Finite,
      maxSupply: initialSupply,
      initialSupply: initialSupply,
    }).freezeWith(client);

    let response = await tokenCreateTx.execute(client);
    let receipt = await response.getReceipt(client);

    this.tokenId = receipt.tokenId;

    console.log("Created token with ID: ", receipt.tokenId?.toString());
  }
);

Given(
  /^The first account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (!this.tokenId || !this.firstAccountId || !this.firstAccountPrivateKey) {
      throw new Error(
        "Token ID, account ID, or account private key is not set"
      );
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.firstAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.firstAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.firstAccountPrivateKey);

      const assocResponse = await signTx.execute(client);
      await assocResponse.getReceipt(client);
    }

    const query = new AccountBalanceQuery({
      accountId: this.firstAccountId,
    });

    const balance = await query.execute(client);
    const currentBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const amountToTransfer = amount - currentBalance;

    if (amountToTransfer !== 0) {
      const transaction = new TransferTransaction()
        .addTokenTransfer(
          this.tokenId,
          this.treasuryAccountId,
          -amountToTransfer
        )
        .addTokenTransfer(this.tokenId, this.firstAccountId, amountToTransfer)
        .freezeWith(client);

      const signTx = await transaction.sign(this.treasuryPrivateKey);
      const response = await signTx.execute(client);
      const receipt = await response.getReceipt(client);

      assert.equal(receipt.status, Status.Success);
    } else {
      console.log(
        "No transfer needed, account already has sufficient balance."
      );
    }
  }
);

Given(
  /^The second account holds (\d+) HTT tokens$/,
  async function (tokenAmount: number) {
    if (
      !this.tokenId ||
      !this.firstAccountId ||
      !this.secondAccountPrivateKey ||
      !this.secondAccountId
    ) {
      throw new Error(
        "Token ID, account ID, or account private key is not set"
      );
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.secondAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.secondAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.secondAccountPrivateKey);

      const assocResponse = await signTx.execute(client);
      await assocResponse.getReceipt(client);
    }

    const accountBalanceQuery = new AccountBalanceQuery({
      accountId: this.secondAccountId,
    });

    const balance = await accountBalanceQuery.execute(client);
    const currentBalance = balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const amountToTransfer = tokenAmount - currentBalance;

    if (amountToTransfer !== 0) {
      const transaction = new TransferTransaction()
        .addTokenTransfer(
          this.tokenId,
          this.treasuryAccountId,
          -amountToTransfer
        )
        .addTokenTransfer(this.tokenId, this.secondAccountId, amountToTransfer)
        .freezeWith(client);

      const signTx = await transaction.sign(this.treasuryPrivateKey);
      const response = await signTx.execute(client);
      const receipt = await response.getReceipt(client);

      assert.equal(receipt.status, Status.Success);
    } else {
      console.log(
        "No transfer needed, second account already has sufficient balance."
      );
    }
  }
);

When(
  /^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/,
  async function (amount: number) {
    console.log({ amount });

    if (!this.tokenId || !this.firstAccountId || !this.secondAccountId) {
      throw new Error("Token ID or account IDs are not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: this.tokenId,
          amount: -amount,
          accountId: this.firstAccountId,
        },
        {
          tokenId: this.tokenId,
          amount: amount,
          accountId: this.secondAccountId,
        },
      ],
    }).freezeWith(client);

    this.pendingTx = await transaction.sign(this.firstAccountPrivateKey);
  }
);

When(/^The first account submits the transaction$/, async function () {
  const p = this.pendingTx;

  let response = await p.execute(client);
  let receipt = await response.getReceipt(client);

  assert.equal(receipt.status, Status.Success);
});

When(
  /^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/,
  async function (amount: number) {
    if (
      !this.tokenId ||
      !this.firstAccountId ||
      !this.secondAccountId ||
      !this.secondAccountPrivateKey
    ) {
      throw new Error("Token ID, account IDs, or private key is not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: this.tokenId,
          amount: -amount,
          accountId: this.secondAccountId,
        },
        {
          tokenId: this.tokenId,
          amount: amount,
          accountId: this.firstAccountId,
        },
      ],
    }).freezeWith(client);

    this.pendingTx = await transaction.sign(this.secondAccountPrivateKey);
  }
);

Then(/^The first account has paid for the transaction fee$/, async function () {
  if (!this.firstAccountId) {
    throw new Error("Account ID is not set");
  }

  const accountInfo = await new AccountInfoQuery({
    accountId: this.firstAccountId,
  }).execute(client);

  assert.ok(accountInfo.isDeleted === false);
});

Given(
  /^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const firstAccountPrivateKey = PrivateKey.generateED25519();
    const firstAccountPublicKey = firstAccountPrivateKey.publicKey;

    const firstAccountTx = await new AccountCreateTransaction()
      .setKey(firstAccountPublicKey)
      .execute(client);

    const firstAccountReceipt = await firstAccountTx.getReceipt(client);

    this.firstAccountId = firstAccountReceipt.accountId;
    this.firstAccountPrivateKey = firstAccountPrivateKey;

    if (!this.tokenId || !this.firstAccountId) {
      throw new Error("Token ID or first account ID is not set");
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.firstAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.firstAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.firstAccountPrivateKey);
      await (await signTx.execute(client)).getReceipt(client);
    }

    const balanceQuery = new AccountBalanceQuery({
      accountId: this.firstAccountId,
    });

    let balance = await balanceQuery.execute(client);
    const currentHbarBalance = balance.hbars.toBigNumber().toNumber();
    const currentTokenBalance =
      balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const hbarDiff = hbarAmount - currentHbarBalance;
    const tokenDiff = tokenAmount - currentTokenBalance;

    if (hbarDiff !== 0) {
      const hbarTransfer = new TransferTransaction()
        .addHbarTransfer(this.treasuryAccountId, new Hbar(-hbarDiff))
        .addHbarTransfer(this.firstAccountId, new Hbar(hbarDiff))
        .freezeWith(client);

      const hbarResponse = await hbarTransfer.execute(client);
      await hbarResponse.getReceipt(client);
    }

    if (tokenDiff !== 0) {
      const tokenTransfer = new TransferTransaction()
        .addTokenTransfer(this.tokenId, this.treasuryAccountId, -tokenDiff)
        .addTokenTransfer(this.tokenId, this.firstAccountId, tokenDiff)
        .freezeWith(client);

      const tokenResponse = await tokenTransfer.execute(client);
      await tokenResponse.getReceipt(client);
    }

    balance = await balanceQuery.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() === hbarAmount);
    assert.ok(balance.tokens?.get(this.tokenId)?.toNumber() === tokenAmount);
  }
);

Given(
  /^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const secondAccountPrivateKey = PrivateKey.generateED25519();
    const secondAccountPublicKey = secondAccountPrivateKey.publicKey;

    const secondAccountTx = await new AccountCreateTransaction()
      .setKey(secondAccountPublicKey)
      .execute(client);

    const secondAccountReceipt = await secondAccountTx.getReceipt(client);

    this.secondAccountId = secondAccountReceipt.accountId;
    this.secondAccountPrivateKey = secondAccountPrivateKey;

    if (!this.tokenId || !this.secondAccountId) {
      throw new Error("Token ID or first account ID is not set");
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.secondAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.secondAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.secondAccountPrivateKey);
      await (await signTx.execute(client)).getReceipt(client);
    }

    const balanceQuery = new AccountBalanceQuery({
      accountId: this.secondAccountId,
    });

    let balance = await balanceQuery.execute(client);
    const currentHbarBalance = balance.hbars.toBigNumber().toNumber();
    const currentTokenBalance =
      balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const hbarDiff = hbarAmount - currentHbarBalance;
    const tokenDiff = tokenAmount - currentTokenBalance;

    if (hbarDiff !== 0) {
      const hbarTransfer = new TransferTransaction()
        .addHbarTransfer(this.treasuryAccountId, new Hbar(-hbarDiff))
        .addHbarTransfer(this.secondAccountId, new Hbar(hbarDiff))
        .freezeWith(client);

      const hbarResponse = await hbarTransfer.execute(client);
      await hbarResponse.getReceipt(client);
    }

    if (tokenDiff !== 0) {
      const tokenTransfer = new TransferTransaction()
        .addTokenTransfer(this.tokenId, this.treasuryAccountId, -tokenDiff)
        .addTokenTransfer(this.tokenId, this.secondAccountId, tokenDiff)
        .freezeWith(client);

      const tokenResponse = await tokenTransfer.execute(client);
      await tokenResponse.getReceipt(client);
    }

    balance = await balanceQuery.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() === hbarAmount);
    assert.ok(balance.tokens?.get(this.tokenId)?.toNumber() === tokenAmount);
  }
);

Given(
  /^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const thirdAccountPrivateKey = PrivateKey.generateED25519();
    const thirdAccountPublicKey = thirdAccountPrivateKey.publicKey;

    const thirdAccountTx = await new AccountCreateTransaction()
      .setKey(thirdAccountPublicKey)
      .execute(client);

    const thirdAccountReceipt = await thirdAccountTx.getReceipt(client);
    this.thirdAccountId = thirdAccountReceipt.accountId!;
    this.thirdAccountPrivateKey = thirdAccountPrivateKey;

    if (!this.tokenId || !this.thirdAccountId) {
      throw new Error("Token ID or third account ID is not set");
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.thirdAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.thirdAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.thirdAccountPrivateKey);
      await (await signTx.execute(client)).getReceipt(client);
    }

    const balanceQuery = new AccountBalanceQuery({
      accountId: this.thirdAccountId,
    });

    let balance = await balanceQuery.execute(client);
    const currentHbarBalance = balance.hbars.toBigNumber().toNumber();
    const currentTokenBalance =
      balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const hbarDiff = hbarAmount - currentHbarBalance;
    const tokenDiff = tokenAmount - currentTokenBalance;

    if (hbarDiff !== 0) {
      const hbarTransfer = new TransferTransaction()
        .addHbarTransfer(this.treasuryAccountId, new Hbar(-hbarDiff))
        .addHbarTransfer(this.thirdAccountId, new Hbar(hbarDiff))
        .freezeWith(client);

      const hbarResponse = await hbarTransfer.execute(client);
      await hbarResponse.getReceipt(client);
    }

    if (tokenDiff !== 0) {
      const tokenTransfer = new TransferTransaction()
        .addTokenTransfer(this.tokenId, this.treasuryAccountId, -tokenDiff)
        .addTokenTransfer(this.tokenId, this.thirdAccountId, tokenDiff)
        .freezeWith(client);

      const tokenResponse = await tokenTransfer.execute(client);
      await tokenResponse.getReceipt(client);
    }

    balance = await balanceQuery.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() === hbarAmount);
    assert.ok(balance.tokens?.get(this.tokenId)?.toNumber() === tokenAmount);
  }
);

Given(
  /^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function (hbarAmount: number, tokenAmount: number) {
    const fourthAccountPrivateKey = PrivateKey.generateED25519();
    const fourthAccountPublicKey = fourthAccountPrivateKey.publicKey;

    const fourthAccountTx = await new AccountCreateTransaction()
      .setKey(fourthAccountPublicKey)
      .execute(client);

    const fourthAccountReceipt = await fourthAccountTx.getReceipt(client);
    this.fourthAccountId = fourthAccountReceipt.accountId!;
    this.fourthAccountPrivateKey = fourthAccountPrivateKey;

    if (!this.tokenId || !this.fourthAccountId) {
      throw new Error("Token ID or fourth account ID is not set");
    }

    const accountInfo = await new AccountInfoQuery({
      accountId: this.fourthAccountId,
    }).execute(client);

    if (!accountInfo.tokenRelationships.get(this.tokenId)) {
      const tx = new TokenAssociateTransaction({
        tokenIds: [this.tokenId],
        accountId: this.fourthAccountId,
      }).freezeWith(client);

      const signTx = await tx.sign(this.fourthAccountPrivateKey);
      await (await signTx.execute(client)).getReceipt(client);
    }

    const balanceQuery = new AccountBalanceQuery({
      accountId: this.fourthAccountId,
    });

    let balance = await balanceQuery.execute(client);
    const currentHbarBalance = balance.hbars.toBigNumber().toNumber();
    const currentTokenBalance =
      balance.tokens?.get(this.tokenId)?.toNumber() || 0;

    const hbarDiff = hbarAmount - currentHbarBalance;
    const tokenDiff = tokenAmount - currentTokenBalance;

    if (hbarDiff !== 0) {
      const hbarTransfer = new TransferTransaction()
        .addHbarTransfer(this.treasuryAccountId, new Hbar(-hbarDiff))
        .addHbarTransfer(this.fourthAccountId, new Hbar(hbarDiff))
        .freezeWith(client);

      const hbarResponse = await hbarTransfer.execute(client);
      await hbarResponse.getReceipt(client);
    }

    if (tokenDiff !== 0) {
      const tokenTransfer = new TransferTransaction()
        .addTokenTransfer(this.tokenId, this.treasuryAccountId, -tokenDiff)
        .addTokenTransfer(this.tokenId, this.fourthAccountId, tokenDiff)
        .freezeWith(client);

      const tokenResponse = await tokenTransfer.execute(client);
      await tokenResponse.getReceipt(client);
    }

    balance = await balanceQuery.execute(client);

    assert.ok(balance.hbars.toBigNumber().toNumber() === hbarAmount);
    assert.ok(balance.tokens?.get(this.tokenId)?.toNumber() === tokenAmount);
  }
);

When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function (amount1: number, amount3: number, amount4: number) {
    if (
      !this.tokenId ||
      !this.firstAccountId ||
      !this.secondAccountId ||
      !this.thirdAccountId ||
      !this.fourthAccountId ||
      !this.firstAccountPrivateKey ||
      !this.secondAccountPrivateKey
    ) {
      throw new Error("Required accounts or token information is not set");
    }

    const transaction = new TransferTransaction({
      tokenTransfers: [
        {
          tokenId: this.tokenId,
          amount: -amount1,
          accountId: this.firstAccountId,
        },
        {
          tokenId: this.tokenId,
          amount: -amount1,
          accountId: this.secondAccountId,
        },
        {
          tokenId: this.tokenId,
          amount: amount3,
          accountId: this.thirdAccountId,
        },
        {
          tokenId: this.tokenId,
          amount: amount4,
          accountId: this.fourthAccountId,
        },
      ],
    }).freezeWith(client);

    // Sign with both sending accounts
    let signTx = await transaction.sign(this.firstAccountPrivateKey);
    this.pendingTx = await signTx.sign(this.secondAccountPrivateKey);
  }
);

Then(
  /^The third account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (!this.tokenId || !this.thirdAccountId) {
      throw new Error("Token ID or third account ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: this.thirdAccountId,
    });

    const balance = await query.execute(client);

    assert.equal(balance.tokens?.get(this.tokenId)?.toNumber(), amount);
  }
);

Then(
  /^The fourth account holds (\d+) HTT tokens$/,
  async function (amount: number) {
    if (!this.tokenId || !this.fourthAccountId) {
      throw new Error("Token ID or fourth account ID is not set");
    }

    const query = new AccountBalanceQuery({
      accountId: this.fourthAccountId,
    });

    const balance = await query.execute(client);

    assert.equal(balance.tokens?.get(this.tokenId)?.toNumber(), amount);
  }
);
