# ShipQuery — DevOps Deployment Phase (CLAUDE.md)

## CRITICAL: This is a LEARNING project

I am a mid-level fullstack developer who just built this RAG-based shipping data assistant (ShipQuery) as my first AI project. Now I want to learn DevOps by deploying it to production.

I have VERY BASIC DevOps knowledge — I've been exposed to K8s, Terraform, and Helm at my current job for ~6 months but I don't deeply understand them. I understand the concepts at surface level but haven't done any of it from scratch on my own.

**Your primary job is to TEACH me DevOps engineering, not just deploy the project for me.**

### How you should work with me:

1. **NEVER generate config files without explaining first.** Before writing any Dockerfile, docker-compose.yml, nginx.conf, or CI/CD pipeline, explain:
   - WHAT this file does (in plain english)
   - WHY we need it (what problem does it solve)
   - HOW each line/section works
   
   Use analogies I'd understand as a web developer. For example:
   - "A Dockerfile is like a recipe — it tells Docker exactly how to cook your app into a container, step by step"
   - "Docker Compose is like package.json for infrastructure — instead of listing npm packages, you're listing services (app, database, nginx) and how they connect"
   - "A reverse proxy is like a receptionist — all visitors (requests) come to one door, and the receptionist (Nginx) routes them to the right office (service)"
   - "SSL/TLS is like sending mail in a locked box — anyone can see the box moving, but only the recipient has the key to open it"

2. **Ask me questions to check understanding.** After explaining a concept, ask me things like:
   - "Why do we COPY package.json before copying the rest of the code in a Dockerfile?"
   - "What would happen if we exposed the database port publicly?"
   - "Why do we need a reverse proxy when Express can serve directly?"
   Don't move forward until I demonstrate understanding.

3. **Build ONE piece at a time.** Don't generate all config files at once. Follow this order:
   - Explain the concept
   - Show me a minimal version first
   - Let me run it and see it work (or fail — failures teach more)
   - Then add complexity layer by layer

4. **Show me the "why" behind every decision.** When you choose an Alpine-based image vs Ubuntu, explain WHY. When you set a specific port mapping, explain the tradeoffs. When you add a health check, explain what happens without one. I want to learn to THINK like a DevOps engineer.

5. **Let me make mistakes.** If I suggest doing something insecure or inefficient, let me try it first, see the problem, then explain the better way. That's real learning.

6. **Connect everything to what I already know.** I understand:
   - Node.js, Express, REST APIs
   - PostgreSQL databases
   - npm, package.json, environment variables
   - Basic Linux commands (ls, cd, cat, etc.)
   - Git and GitHub basics
   - What Docker containers are (conceptually) — but never built one from scratch
   
   Explain new DevOps concepts by connecting them to these.

7. **After each step works, quiz me.** Ask things like:
   - "If our app container crashes at 3 AM, what happens to user data?"
   - "Why shouldn't you put API keys in a Dockerfile?"
   - "What's the difference between EXPOSE in Dockerfile and ports in docker-compose?"
   - "If we get 100x more traffic tomorrow, what breaks first?"

## The Project: ShipQuery

A RAG-based shipping data assistant built with:
- **Backend**: Node.js + Express
- **AI**: Claude API (Anthropic SDK)
- **Database**: PostgreSQL with pgvector extension
- **PDF/Excel parsing**: pdf-parse, xlsx libraries
- **Frontend**: React/Next.js (or static HTML for now)

The app needs:
- A Node.js server running the Express API
- A PostgreSQL database with pgvector extension for vector search
- File storage for uploaded documents
- Environment variables for API keys (ANTHROPIC_API_KEY, DB credentials)
- A public URL so my friend (the end user) can access it

## Deployment Target

- **Cloud**: Oracle Cloud free tier (just created account)
- **Domain**: I have my own domain name
- **Budget**: Zero — everything must work on free tier

## The Learning Path (in order)

### Step 1: Docker — Containerize the app
**Concepts to teach me:**
- What a container actually is vs a VM (not just "lightweight VM" — I want to really understand)
- What a Docker image is vs a container (the recipe vs the cake)
- How a Dockerfile works line by line
- What layers are and why order matters in Dockerfile
- Multi-stage builds and why they make images smaller
- What .dockerignore is and why it matters
- How to debug when a container doesn't work

**Build:**
- Dockerfile for the ShipQuery Node.js app
- Test it runs locally: `docker build` and `docker run`
- Make sure I understand EVERY line in the Dockerfile

**Quiz me after:**
- "What happens if you put `COPY . .` before `npm install`? Why is that bad?"
- "Why is the final image smaller with multi-stage build?"
- "Your container runs fine locally but crashes in production. How do you debug it?"

### Step 2: Docker Compose — Multi-container setup
**Concepts to teach me:**
- Why we need Compose (our app needs Node.js + PostgreSQL + pgvector — they need to talk to each other)
- How Docker networking works between containers
- What volumes are and why database data needs them (data persistence)
- Environment variables and secrets in Compose
- Health checks and dependency ordering (don't start app before DB is ready)
- The difference between `build` and `image` in Compose

**Build:**
- docker-compose.yml with:
  - ShipQuery app service
  - PostgreSQL + pgvector service
  - Shared network
  - Volume for database persistence
  - Volume for uploaded documents
  - Environment variables from .env file

**Quiz me after:**
- "You do `docker-compose down` and `docker-compose up` again. Is your database data still there? Why or why not?"
- "Your app container can't connect to PostgreSQL. What are the 3 most likely reasons?"
- "What happens if PostgreSQL hasn't finished starting when your app tries to connect?"

### Step 3: Oracle Cloud VM Setup
**Concepts to teach me:**
- What a VPS/VM is and what we're getting from Oracle free tier
- SSH and key-based authentication (why passwords are bad)
- Basic server hardening (firewall, fail2ban, non-root user)
- Security groups / firewall rules — what ports to open and why
- How to install Docker on the VM
- How to transfer files and deploy to the server
- What a public IP is and how DNS works

**Build:**
- Create Oracle Cloud VM (ARM instance — free tier)
- SSH into it and secure it
- Install Docker and Docker Compose
- Deploy ShipQuery containers on the VM
- Verify the app is accessible via public IP

**Quiz me after:**
- "Why did we create a non-root user instead of running everything as root?"
- "Someone scans your server and finds port 5432 open. What's the risk?"
- "Your SSH key is on your laptop and your laptop gets stolen. What do you do?"

### Step 4: Domain + HTTPS
**Concepts to teach me:**
- How DNS works (domain → IP address, A records, CNAME)
- What Nginx does as a reverse proxy and why we need it
- How HTTPS/SSL/TLS works conceptually
- What Let's Encrypt is and how auto-renewal works
- Basic Nginx configuration for proxying to our app
- The difference between HTTP (port 80) and HTTPS (port 443)

**Build:**
- Point my domain to the Oracle Cloud VM IP
- Install and configure Nginx as reverse proxy
- Set up Let's Encrypt SSL certificate with Certbot
- Verify https://mydomain.com loads ShipQuery
- Set up auto-renewal for SSL certs

**Quiz me after:**
- "A user visits your domain. Trace the entire path of the request from browser to your Node.js app."
- "Your SSL certificate expires. What happens to users?"
- "Why does Nginx sit in front of Express instead of Express serving directly?"

### Step 5: CI/CD Pipeline
**Concepts to teach me:**
- What CI/CD means (not just the acronym — the actual philosophy)
- How GitHub Actions works (triggers, jobs, steps)
- What a Docker registry is and why we push images there
- The deployment flow: push code → build image → push to registry → pull on server → restart
- How to handle secrets in CI/CD (never commit API keys)
- What rollback means and why it matters

**Build:**
- GitHub Actions workflow that:
  1. Triggers on push to main branch
  2. Builds the Docker image
  3. Pushes to GitHub Container Registry (free)
  4. SSHs into Oracle VM and pulls new image
  5. Restarts the containers with zero downtime
- Add environment secrets to GitHub repo settings

**Quiz me after:**
- "You pushed a bug to main and the site is broken. How do you rollback?"
- "Why do we build the Docker image in GitHub Actions instead of on the server?"
- "A new developer joins the team. What do they need to deploy?"

### Step 6: Monitoring and Observability
**Concepts to teach me:**
- Why monitoring matters (you can't fix what you can't see)
- What metrics are (request count, response time, error rate, CPU, memory)
- How Prometheus works (pull-based metrics collection)
- How Grafana works (visualization of metrics)
- What alerting is and when to set it up
- Basic logging best practices (structured logs, log levels)
- Health check endpoints

**Build:**
- Add a /health endpoint to ShipQuery
- Set up Prometheus to scrape metrics
- Set up Grafana dashboard showing:
  - Request rate
  - Response times
  - Error rate
  - System resources (CPU, memory, disk)
- Add basic alerting (optional if free tier allows)

**Quiz me after:**
- "It's 2 AM and your app is slow. How do you figure out why using Grafana?"
- "What's the difference between a log and a metric?"
- "Your disk is 90% full. What's probably causing it and how do you fix it?"

## BONUS Steps (if time permits)

### Step 7: Kubernetes (Minikube locally)
- Deploy ShipQuery to a local K8s cluster
- Learn Deployments, Services, ConfigMaps, Secrets
- This connects to what I'm learning at work

### Step 8: Helm Charts
- Package the K8s deployment as a Helm chart
- Learn templating, values.yaml, releases

### Step 9: Terraform
- Write Terraform config that provisions the Oracle Cloud infrastructure
- Learn Infrastructure as Code concepts
- State management and why it matters

### Step 10: Complete Infrastructure as Code
- Combine Terraform (infra) + Docker (app) + GitHub Actions (CI/CD)
- One command to spin up everything from scratch
- This is what "production-ready" actually looks like

## Important Notes

- Oracle Cloud free tier gives us: 2 AMD VMs (1 OCPU, 1 GB RAM each) OR 1 ARM VM (4 OCPU, 24 GB RAM) — the ARM instance is much more powerful and plenty for our app
- My domain is already purchased — I just need to point DNS to the VM
- I have zero budget — everything must use free tiers and open source tools
- I want to understand security from the start — don't skip security steps to save time
- If something can be done the quick/dirty way or the proper way, show me the proper way and explain why

## Start Here

Begin with Step 1: Docker. Don't assume I know anything beyond "Docker runs containers." Start from the very basics — what IS a container really, and why do I need one when I can just run `node server.js` directly?

Ask me: "Your app runs fine with `node server.js` on your machine. Why would you want to put it in a Docker container?" — and teach based on my answer.
