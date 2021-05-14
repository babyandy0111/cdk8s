# Just Another CDK8S Sample

## Install ArgoCD
* Create a namespace And Install ArgoCD Directly
```shell script
## Create a namespace in your K8S Cluster
kubectl create namespace argocd
## install ArgoCD with default YAML
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

* Install ArgoCD Cli (Optional)
```shell script
## Linux Users
VERSION=$(curl --silent "https://api.github.com/repos/argoproj/argo-cd/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
sudo curl --silent --location -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/download/$VERSION/argocd-linux-amd64
sudo chmod +x /usr/local/bin/argocd

## Mac Users
brew install argocd
```

* Expose ArgoCD Web GUI
```shell script
## It will create a load balancer without SSL Support and point to ArgoCD Service
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

## After load balancer is created, try fetch argocd service endpoint
export ARGOCD_SERVER=`kubectl get svc argocd-server -n argocd -o json | jq --raw-output .status.loadBalancer.ingress[0].hostname`
```

* Fetch Admin password
```shell script
## Linux 
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d ; echo
## Mac
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 --decode; echo
```

* Open the web gui and login
```shell script
## uaername / password: admin / {password via the command}
open ${ARGOCD_SERVER}
```

Reference: https://www.eksworkshop.com/intermediate/290_argocd/

## Install Traefik

* Install Helm Client
```shell script
## Mac
brew install helm
```

* Add Traefik's Helm Repository
```shell script
helm repo add traefik https://helm.traefik.io/traefik
```

* Then update and install traefik
```shell script
helm repo update
helm install traefik traefik/traefik

## you can also install traefik in other namespace
helm install traefik traefik/traefik -n [my_namespace]
```

* Expose Traefic in your "localhost"
```shell script
## point your localhost's 9000 to Traefik's 9000 port
kubectl port-forward $(kubectl get pods --selector "app.kubernetes.io/name=traefik" --output=name) 9000:9000
```

Reference: https://doc.traefik.io/traefik/getting-started/install-traefik/ls

## Initialize CDK8S Project
* Install CDK8S Package
```shell script
npm i -g cdk8s
``` 

* create cdk8s project 
```shell script
mkdir my-cdk8s && cdk8s init typescript-app
```

* Compile and deploy
```shell script
npm run compile && kubectl apply -f dist/*
```
