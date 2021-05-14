import { Construct } from 'constructs';
import {ApiObject, App, Chart, ChartProps, Helm} from 'cdk8s';
import {KubeDeployment} from "./imports/k8s";

export class MyChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = { }) {
    super(scope, id, props);

    // define resources here
    // 請先確定已經安裝好 Helm 並透過 Helm 安裝好 Traefik
    // -- 建立 Traefik 服務，使用 Helm
    let controller = new Helm(this, "traefik", {
      chart: "traefik/traefik",
      values: {
        ingressRoute: {
          dashboard: {
            enabled: true,
            insecure: true
          },
        },
        // ports: {
        //   web: {
        //     redirectTo: "websecure"
        //   }
        // },
        service: {
          annotations: {
            "service.beta.kubernetes.io/aws-load-balancer-type": "alb",
            "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": "arn:aws:acm:ap-northeast-1:791762661746:certificate/ea392257-5692-47a3-b6a9-f8eb40c12ad5",
            "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "443"
          },
          spec: {
            externalTrafficPolicy: "Cluster"
          }
        }
      }
    })
    // 建立驗證機制
    let auth = new ApiObject(this, "traefik-auth", {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "traefik-dashboard-basicauth-secret",
        namespace: "traefik"
      },
      data: {
        users: "YWRtaW46OTJCY1o1S2VuSEo3OHZWRQo="
      }
    })
    auth.addDependency(controller)
    // 建立 middleware 機制
    let middleware = new ApiObject(this, "traefik-middleware", {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "Middleware",
      metadata: {
        name: "traefik-dashboard-basicauth"
      },
      spec: {
        basicAuth: {
          secret: auth.metadata.name
        }
      }
    })
    middleware.addDependency(auth)
    // 建立一個 whoami container 測試 route 是否正確
    new KubeDeployment(this, "whoami-deployment", {
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
                name: "whoami-container",
                image: "containous/whoami:latest",
                ports: [
                  {
                    containerPort: 80
                  }
                ]
              }
            ]
          }
        }
      },
      metadata: {
        name: "whoami-deployment"
      }
    })
    // 建立 dashboard route
    let dashboard = new ApiObject(this, "traefik-dashboard", {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "IngressRoute",
      metadata: {
        name: "traefik-dashboard",
        namespace: "traefik"
      },
      spec: {
        entrypoints: ["websecure", "web"],
        routes: [
          {
            kind: "Rule",
            match: "Host(`micro.indochat.net`)",
            middlewares: [
              {
                name: middleware.metadata.name,
              }
            ],
            services: [
              {
                kind: "TraefikService",
                name: "api@internal"
              }
            ]
          },
          {
            kind: "Rule",
            match: "PathPrefix(`/whoami`)",
            services: [
              {
                name: "whoami-deployment-668b6b68cc-",
                port: "80"
              }
            ]
          }
        ]
      }
    })
    dashboard.addDependency(middleware)

    // -- 建立其他的服務？
  }
}

const app = new App();
new MyChart(app, 'cdk8s-example');
app.synth();
