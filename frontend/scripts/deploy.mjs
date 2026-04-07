import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve(process.cwd(), 'dist', 'frontend', 'browser');
const host = process.env.DEPLOY_HOST || '';
const user = process.env.DEPLOY_USER || '';
const deployPath = process.env.DEPLOY_PATH || '';
const localPath = process.env.DEPLOY_LOCAL_PATH || '';
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

if (localPath || (deployPath && !host && !user)) {
  const targetPath = path.resolve(localPath || deployPath);
  log(`Deploying locally to: ${targetPath}`);

  try {
    rmSync(targetPath, { recursive: true, force: true });
    mkdirSync(targetPath, { recursive: true });
    cpSync(distDir, targetPath, { recursive: true });
    log('Local deployment completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[deploy] Local deployment failed.');
    process.exit(1);
  }
}

if (!host || !user || !deployPath) {
  log('Deployment variables are not set. Skipping deployment.');
  log('For remote deploy: set DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH.');
  log('For local deploy on VPS: set DEPLOY_LOCAL_PATH (or DEPLOY_PATH only).');
  process.exit(0);
}

const sshBase = ['ssh', '-p', String(port)];
if (sshKey) {
  sshBase.push('-i', sshKey);
}
sshBase.push(`${user}@${host}`);

const remoteCommand = `mkdir -p '${deployPath}' && find '${deployPath}' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xf - -C '${deployPath}'`;
const sshCommand = sshBase.map((part) => `"${part.replace(/"/g, '\\"')}"`).join(' ');
const tarCommand = `tar -C "${distDir}" -cf - . | ${sshCommand} "${remoteCommand.replace(/"/g, '\\"')}"`;

try {
  run(tarCommand);
  log('Deployment completed successfully.');
} catch (error) {
  console.error('[deploy] Deployment failed.');
  process.exit(1);
}
