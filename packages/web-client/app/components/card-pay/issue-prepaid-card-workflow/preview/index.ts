import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { taskFor } from 'ember-concurrency-ts';
import { reads } from 'macro-decorators';
import WorkflowSession from '@cardstack/web-client/models/workflow/workflow-session';
import { task, TaskGenerator } from 'ember-concurrency';
import CardCustomization, {
  PrepaidCardCustomization,
} from '@cardstack/web-client/services/card-customization';
import HubAuthentication from '@cardstack/web-client/services/hub-authentication';
import Layer2Network from '@cardstack/web-client/services/layer2-network';
import { tracked } from '@glimmer/tracking';

// http://ember-concurrency.com/docs/typescript
// infer whether we should treat the return of a yield statement as a promise
type Resolved<T> = T extends PromiseLike<infer R> ? R : T;

interface CardPayDepositWorkflowPreviewComponentArgs {
  workflowSession: WorkflowSession;
  onComplete: () => void;
  isComplete: boolean;
}

export default class CardPayDepositWorkflowPreviewComponent extends Component<CardPayDepositWorkflowPreviewComponentArgs> {
  @service declare cardCustomization: CardCustomization;
  @service declare hubAuthentication: HubAuthentication;
  @service declare layer2Network: Layer2Network;

  @reads('args.workflowSession.state.spendFaceValue')
  declare faceValue: number;

  @tracked errorMessage = '';

  @task *issueTask(): TaskGenerator<void> {
    let { workflowSession } = this.args;
    yield this.hubAuthentication.ensureAuthenticated();
    // yield statements require manual typing
    // https://github.com/machty/ember-concurrency/pull/357#discussion_r434850096
    let customization: Resolved<PrepaidCardCustomization> = yield taskFor(
      this.cardCustomization.createCustomizationTask
    ).perform({
      issuerName: workflowSession.state.issuerName,
      colorSchemeId: workflowSession.state.colorScheme.id,
      patternId: workflowSession.state.pattern.id,
    });
    yield taskFor(this.layer2Network.issuePrepaidCard)
      .perform(this.faceValue, customization.did)
      .then((address: string) => {
        this.args.workflowSession.update('prepaidCardAddress', address);
        this.args.onComplete();
      });
  }

  get issueState() {
    if (taskFor(this.issueTask).isRunning) {
      return 'in-progress';
    } else if (this.args.isComplete) {
      return 'memorialized';
    } else {
      return 'default';
    }
  }
}
