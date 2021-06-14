class WalletAccount {
  constructor(
    readonly address: string,
    readonly name: string,
    readonly imageBase64: string | undefined = undefined
  ) {}

  get imageSrc(): string | undefined {
    if (this.imageBase64) {
      return `data:image/jpeg;charset=utf-8;base64,${this.imageBase64}`;
    }
    return undefined;
  }
}

export default class WalletInfo {
  accounts: WalletAccount[];
  chainId: number;

  get firstAddress(): string | undefined {
    return this.accounts.length ? this.accounts[0].address : undefined;
  }

  constructor(rawAccounts: string[] | any[], chainId: number) {
    if (rawAccounts.length > 0 && typeof rawAccounts[0] === 'string') {
      this.accounts = rawAccounts.map(
        (address: string) => new WalletAccount(address, address)
      );
    } else {
      this.accounts = rawAccounts.map(
        (rawAccount: any) =>
          new WalletAccount(
            rawAccount.address,
            rawAccount.name,
            rawAccount.imageBase64
          )
      );
    }

    this.chainId = chainId;
  }

  isEqualTo(other: WalletInfo) {
    return (
      this.chainId === other.chainId && this.firstAddress === other.firstAddress
    );
  }
}
