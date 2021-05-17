/* eslint-disable ember/no-empty-glimmer-component-classes */
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { next } from '@ember/runloop';

class CardPayIssuePrepaidCardWorkflowNextStepsComponent extends Component {
  @service declare router: RouterService;

  @action async openNewIssuanceWorkflow() {
    await this.router.transitionTo({ queryParams: { flow: null } });
    next(this, () => {
      this.router.transitionTo({ queryParams: { flow: 'issue-prepaid-card' } });
    });
  }

  @action returnToDashboard() {
    this.router.transitionTo({ queryParams: { flow: null } });
  }
}

export default CardPayIssuePrepaidCardWorkflowNextStepsComponent;
