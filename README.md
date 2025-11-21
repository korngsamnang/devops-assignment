# DevOps Engineer Assignment

A Node.js Express API deployed to Amazon EKS with automated CI/CD pipeline.

## Table of Contents

-   [Overview](#overview)
-   [Project Structure](#project-structure)
-   [Prerequisites](#prerequisites)
-   [Task 1: Containerization](#task-1-containerization)
-   [Task 2: CI/CD Pipeline](#task-2-cicd-pipeline)
-   [Task 3: Kubernetes Deployment](#task-3-kubernetes-deployment)
-   [Task 4: Testing & Verification](#task-4-testing--verification)
-   [Cleanup](#cleanup)

---

## Overview

This project demonstrates a complete DevOps workflow including containerization, CI/CD automation, and Kubernetes orchestration on AWS infrastructure.

**Tech Stack:**

-   Application: Node.js + Express
-   Container Registry: Amazon ECR
-   Container Orchestration: Amazon EKS
-   CI/CD: GitHub Actions
-   Load Balancing: AWS ELB

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── k8s/
│   ├── namespace.yaml          # Kubernetes namespace
│   ├── deployment.yaml         # Application deployment
│   └── service.yaml            # LoadBalancer service
├── .dockerignore               # Docker ignore file
├── Dockerfile                  # Container definition
├── app.js                      # Express application
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

---

## Prerequisites

Before starting, make sure you have:

-   AWS Account with appropriate permissions
-   AWS CLI installed and configured
-   kubectl installed
-   eksctl installed (optional, for easier EKS setup)
-   Docker installed locally
-   GitHub account

---

## Task 1: Containerization

### Application Overview

The app is a simple Express API with two endpoints:

-   `GET /api/hello` - Returns JSON greeting with timestamp
-   `GET /health` - Health check endpoint

### Dockerfile Design

I used `node:20-alpine` as the base image for these reasons:

-   Small footprint (~40MB vs ~300MB for regular node image)
-   Contains everything needed to run Node.js apps
-   Official and well-maintained by Docker

The Dockerfile follows best practices:

1. Copy `package.json` first for better layer caching
2. Install production dependencies only (`--omit=dev` flag)
3. Copy application code last
4. Use non-root user implicitly (Alpine's default)
5. Single CMD instruction for the container process

### Running Locally

**Without Docker:**

```bash
npm install
npm start
```

Visit `http://localhost:8080/api/hello`

**With Docker:**

```bash
# Build the image
docker build -t devops-assignment .

# Run the container
docker run -p 8080:8080 devops-assignment

# Test it
curl http://localhost:8080/api/hello
```

---

## Task 2: CI/CD Pipeline

### Workflow Overview

The GitHub Actions pipeline (`.github/workflows/deploy.yml`) automates the entire deployment process.

**Triggers:**

-   Push to `master` branch
-   Pull requests to `master` branch

### Pipeline Stages

#### Stage 1: Build & Push to ECR

1. Checkout code from repository
2. Configure AWS credentials
3. Login to Amazon ECR
4. Build Docker image
5. Tag with commit SHA
6. Push the tag to ECR

#### Stage 2: Deploy to EKS

1. Configure AWS credentials
2. Update kubeconfig for EKS cluster
3. Apply Kubernetes manifests
4. Wait for deployment rollout

### GitHub Secrets Required

Add these secrets in your repository settings (`Settings` → `Secrets and variables` → `Actions`):

| Secret Name             | Description         |
| ----------------------- | ------------------- |
| `AWS_ACCESS_KEY_ID`     | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |

### AWS Setup

**1. Create ECR Repository:**

```bash
aws ecr create-repository \
  --repository-name devops-assignment \
  --region ap-southeast-1
```

**2. Create EKS Cluster:**

Using eksctl (recommended):

```bash
eksctl create cluster \
  --name my-eks \
  --region ap-southeast-1 \
  --nodes 2 \
  --node-type t3.small
```

Or using AWS Console:

-   Go to EKS service
-   Create cluster named `my-eks`
-   Create node group with 2 nodes

**3. Update Deployment Image URL:**

Edit `k8s/deployment.yaml` and replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID:

```yaml
image: <AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/devops-assignment:latest
```

---

## Task 3: Kubernetes Deployment

### Architecture

The application runs on EKS with the following components:

| Component      | Purpose                | Configuration     |
| -------------- | ---------------------- | ----------------- |
| **Namespace**  | Isolates resources     | `devops`          |
| **Deployment** | Manages pods           | 2 replicas        |
| **Service**    | Exposes app externally | LoadBalancer type |

### Deployment Configuration

**Replicas:** 2 pods for basic high availability

**Resource Limits:**

-   Memory: 128Mi (request) / 256Mi (limit)
-   CPU: 100m (request) / 200m (limit)

**Health Checks:**

-   Liveness probe: `/health` endpoint
-   Readiness probe: `/health` endpoint
-   Ensures pods are healthy before receiving traffic

### Service Configuration

Type: `LoadBalancer`

-   Creates AWS Elastic Load Balancer automatically
-   Exposes app on port 80
-   Routes traffic to pod port 8080

### Manual Deployment Steps

If you want to deploy manually (without CI/CD):

**1. Configure kubectl:**

```bash
aws eks update-kubeconfig --name my-eks --region ap-southeast-1
```

**2. Verify connection:**

```bash
kubectl get nodes
```

**3. Apply manifests:**

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

**4. Check deployment status:**

```bash
kubectl get pods -n devops
kubectl get service -n devops
```

**5. Get LoadBalancer DNS:**

```bash
kubectl get service devops-app-service -n devops
```

Look for the `EXTERNAL-IP` column. It takes 2-3 minutes to provision.

---

## Task 4: Testing & Verification

### Get the Application URL

```bash
# Get LoadBalancer DNS name
export LB_DNS=$(kubectl get service devops-app-service -n devops -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Application URL: http://$LB_DNS"
```

### Test the Endpoints

**Main API endpoint:**

```bash
curl http://$LB_DNS/api/hello
```

Expected response:

```json
{
    "message": "Hello from DevOps Assignment😊",
    "timestamp": "2024-11-21T10:30:00.000Z",
    "environment": "production"
}
```

**Health check:**

```bash
curl http://$LB_DNS/health
```

Expected response:

```json
{
    "status": "healthy"
}
```

### Verify Kubernetes Resources

```bash
# Check pods are running
kubectl get pods -n devops

# Check deployment status
kubectl get deployment -n devops

# Check service
kubectl get service -n devops

# View pod logs
kubectl logs -n devops -l app=devops-app
```

### Test High Availability

Delete one pod and watch it automatically recreate:

```bash
# Get pod name
kubectl get pods -n devops

# Delete one pod
kubectl delete pod <pod-name> -n devops

# Watch it recreate
kubectl get pods -n devops -w
```

---

## Cleanup

**Important:** Delete all resources to avoid AWS charges.

```bash
# Delete Kubernetes resources
kubectl delete namespace devops

# Delete EKS cluster (takes 10-15 minutes)
eksctl delete cluster --name my-eks --region ap-southeast-1

# Delete ECR repository
aws ecr delete-repository \
  --repository-name devops-assignment \
  --region ap-southeast-1 \
  --force
```

---

## Reasoning & Design Decisions

### Why Alpine Linux?

-   90% smaller than regular Node images
-   Faster builds and deployments
-   Contains only essentials

### Why 2 Replicas?

-   Basic high availability
-   Handles rolling updates with zero downtime
-   Not too resource-intensive for a demo

### Why LoadBalancer Service?

-   Simple to set up
-   AWS handles everything automatically
-   Gets public DNS name immediately

### What Could Be Improved?

For real production, I would add:

-   Ingress controller with HTTPS
-   Route53 for custom domain
-   Horizontal Pod Autoscaler
-   Resource monitoring (CloudWatch/Prometheus)
-   Secrets management (AWS Secrets Manager)
-   Image vulnerability scanning
-   Multi-stage Docker builds
-   Database connection (if needed)

---

## Contact

**Assignment submitted by:** [Korng Samnang](https://korngsamnang.me/).
