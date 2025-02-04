import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import config from '@cardstack/ssr-web/config/environment';
import { generateMerchantPaymentUrl } from '@cardstack/cardpay-sdk';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import AppContextService from '@cardstack/ssr-web/services/app-context';
import ProfileService from '@cardstack/ssr-web/services/profile';
import HubAuthentication from '@cardstack/ssr-web/services/hub-authentication';
import UA from '@cardstack/ssr-web/services/ua';
import Subgraph from '@cardstack/ssr-web/services/subgraph';
import { PaymentLinkMode } from '../common/payment-link';
import CardstackLogoForQR from '../../images/icons/cardstack-logo-opaque-bg.svg';
import CardSpaceLogo from '../../images/logos/profile-logo-with-background.png';
import { getSentry } from '@cardstack/ssr-web/utils/sentry';

interface ProfileUserPageArgs {
  model: {
    did: string;
    id: string;
    name: string;
    backgroundColor: string;
    ownerAddress: string;
    textColor: string;
  };
}

export default class ProfileUserPage extends Component<ProfileUserPageArgs> {
  @service('app-context') declare appContext: AppContextService;
  @service('profile') declare profile: ProfileService;
  @service('hub-authentication') declare hubAuthentication: HubAuthentication;
  @service('ua') declare UAService: UA;
  @tracked paymentLinkMode: PaymentLinkMode = 'link';
  @tracked address: string | null = null;
  @tracked addressFetchingError: string | null = null;
  @service declare subgraph: Subgraph;
  sentry = getSentry();
  cardstackLogoForQR = CardstackLogoForQR;
  defaultAddressFetchingErrorMsg =
    'We ran into an issue while generating the payment request link. Please reload the page and try again. If the issue persists, please contact support.';

  get profileLogoPng() {
    return this.appContext.getAbsolutePath(CardSpaceLogo);
  }

  get canDeepLink() {
    return this.UAService.isIOS() || this.UAService.isAndroid();
  }

  get meta() {
    return {
      description: `Visit ${this.args.model.name}’s profile on card.xyz`,
      title: `${this.args.model.name}’s Profile`,
      url: `https://${this.args.model.id}${config.profileHostnameSuffix}`,
    };
  }

  @action async loadAddress() {
    this.addressFetchingError = null;

    let address;
    let did = this.args.model.did;

    try {
      let queryResult = await this.subgraph.query(
        config.chains.layer2,
        `query($did: String!) {
            merchantSafes(where: { infoDid: $did }) {
              id
            }
          }`,
        {
          did,
        }
      );

      address = queryResult?.data?.merchantSafes[0]?.id;
    } catch (e) {
      this.addressFetchingError = this.defaultAddressFetchingErrorMsg;
      this.sentry.captureException(e);
    }

    if (address) {
      this.address = address;
    } else {
      this.addressFetchingError = this.defaultAddressFetchingErrorMsg;
      this.sentry.captureException(
        `Unable to find merchant address for ${did}`
      );
    }
  }

  get paymentURL() {
    if (!this.address) return null;

    return generateMerchantPaymentUrl({
      domain: config.universalLinkDomain,
      merchantSafeID: this.address as string,
      network: config.chains.layer2,
    });
  }
}
