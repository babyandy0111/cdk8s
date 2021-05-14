import { Construct } from 'constructs';
import {ApiObject, App, Chart, ChartProps} from 'cdk8s';
import {KubeDeployment, KubeService} from "./imports/k8s";

export class MyChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = { }) {
    super(scope, id, props);

    // define resources here
    // 請先確定已經安裝好 Helm 並透過 Helm 安裝好 Traefik
    // 以下先建立一個範例路由
    // 1. 首先建立一個 Service
    let svc1 = new KubeService(this, "whoami-service", {
      metadata: {
        name: "whoami-service"
      },
      spec: {
        selector: {
          app: "whoami"  // 將此服務指向至標籤內為 app=whoami 的 deployment
        },
        ports: [
          {
            protocol: "TCP",  // 此服務會 expose 80 port
            port: 80
          }
        ]
      }
    })
    // 2. 建立一個 Deployment
    let deployment1 = new KubeDeployment(this, "whoami-deployment", {
      metadata: {
        name: "whoami-deployment",
        labels: {
          app: "whoami"
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: "whoami"
          }
        },
        template: {
          metadata: {
            labels: {
              app: "whoami"
            }
          },
          spec: {
            containers: [
              {
                name: "whoami",
                image: "containous/whoami:latest",
                ports: [
                  {
                    name: "web",
                    containerPort: 80
                  }
                ]
              }
            ]
          }
        }
      }
    })
    deployment1.addDependency(svc1)
    // 3. 建立一個有 basic auth 的驗證 middleware
    let secret1 = new ApiObject(this, "traefik-dashboard-auth-secret", {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "traefik-dashboard-basicauth-secret"
      },
      data: {
        users: "YWRtaW46c2FtcGxlCg=="
      }
    })
    let middleware1 = new ApiObject(this, "traefik-dashboard-middleware-secret", {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "Middleware",
      metadata: {
        name: "traefik-dashboard-basicauth-middleware"
      },
      spec: {
        basicAuth: {
          secret: secret1.metadata.name
        }
      }
    })
    middleware1.addDependency(secret1)
    // 4. 建立 IngressRoute for Traefik
    let ig1 = new ApiObject(this, "traefik-whoami-ingressroute", {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "IngressRoute",
      metadata: {
        name: "traefik-ingressroute"
      },
      spec: {
        entryPoints: [
            "web"
        ],
        routes: [
          {
            match: "(PathPrefix(`/api`) || PathPrefix(`/dashboard`))",
            kind: "Rule",
            // middlewares: [
            //   {
            //     name: middleware1.metadata.name
            //   }
            // ],
            services: [
              {
                name: "api@internal",
                kind: "TraefikService",
              }
            ]
          },
          {
            match: "(PathPrefix(`/whoami`) && Host(`micro.mydomain.net`))",
            kind: "Rule",
            services: [
              {
                name: "whoami-service",
                port: 80,
              }
            ]
          }
        ]
      }
    })
    ig1.addDependency(svc1, deployment1)

    // -- 建立其他的服務？
  }
}

const app = new App();
new MyChart(app, 'cdk8s-example');
app.synth();
