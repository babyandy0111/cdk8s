import { Construct } from 'constructs';
import {ApiObject, App, Chart, ChartProps} from 'cdk8s';
import {TraefikService, TraefikDeployment} from "./props/traefik"

export class MyChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = { }) {
    super(scope, id, props);

    // define resources here
    // -- 建立 Traefik Service / Deployment
    let obj1 = new ApiObject(this, "traefik-service", TraefikService)
    let obj2 = new ApiObject(this, "traefik-deployment", TraefikDeployment)
    obj2.addDependency(obj1)
  }
}

const app = new App();
new MyChart(app, 'cdk8s-example');
app.synth();
