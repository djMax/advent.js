import path from 'path';
import { Service, Server } from '@gasbuddy/service';

export class AdventService extends Service {
  async loadDefaultConfiguration(configFactory, envConfit) {
    const adventDefaults = path.join(__dirname, '..', 'config');
    await Service.addDefaultConfiguration(configFactory, adventDefaults, envConfit);
    return Service.prototype.loadDefaultConfiguration
      .call(this, configFactory, envConfit);
  }

  async destroy() {
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const webdev = require('@gasbuddy/web-dev');
      webdev.shutdownWebpackWatcher(this.app);
    } catch (error) {
      // Nothing to do here.
    }
    return super.destroy();
  }
}


AdventService.Server = class AdventServer extends Server {
  constructor(nameOrOpts) {
    if (nameOrOpts instanceof AdventService) {
      super(nameOrOpts);
    } else {
      super(new AdventService(nameOrOpts));
    }
  }

  async create(sourcedir) {
    return super.create(sourcedir).then(() => {
      this.service.socketio.setup(this.servers[0]);
    });
  }
};
