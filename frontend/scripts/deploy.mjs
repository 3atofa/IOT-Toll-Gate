import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve(process.cwd(), 'dist', 'frontend', 'browser');
const host = process.env.DEPLOY_HOST || '';
const user = process.env.DEPLOY_USER || '';
const remotePath = process.env.DEPLOY_PATH || '';
const port = Number(process.env.DEPLOY_PORT || 22);
const sshKey = process.env.DEPLOY_SSH_KEY || '';

const log = (message) => {
  console.log(`[deploy] ${message}`);
};

const run = (command) => {
  log(command);
  execSync(command, { stdio: 'inherit', shell: true });
};

if (!existsSync(distDir)) {
  log(`Build output not found at ${distDir}. Nothing to deploy.`);
  process.exit(0);
}

if (!host || !user || !remotePath) {
  log('Deployment variables are not set. Skipping server upload.');
  log('Set DEPLOY_HOST, DEPLOY_USER, and DEPLOY_PATH to enable auto-deploy after build.');
  process.exit(0);
}

const sshBase = ['ssh', '-p', String(port)];
if (sshKey) {
  sshBase.push('-i', sshKey);
}
sshBase.push(`${user}@${host}`);

const remoteCommand = `mkdir -p '${remotePath}' && find '${remotePath}' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xf - -C '${remotePath}'`;
const sshCommand = sshBase.map((part) => `"${part.replace(/"/g, '\\"')}"`).join(' ');
const tarCommand = `tar -C "${distDir}" -cf - . | ${sshCommand} "${remoteCommand.replace(/"/g, '\\"')}"`;

try {
  run(tarCommand);
  log('Deployment completed successfully.');
} catch (error) {
  console.error('[deploy] Deployment failed.');
  process.exit(1);
}
