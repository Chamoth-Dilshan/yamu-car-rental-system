const { spawnSync } = require('child_process')
const path = require('path')

const script = process.argv[2]
const tasks = {
  lint: [
    ['client', 'lint'],
    ['server', 'lint']
  ],
  build: [
    ['client', 'build'],
    ['server', 'build']
  ],
  'build:client': [['client', 'build']],
  'build:server': [['server', 'build']]
}

if (!tasks[script]) {
  console.error(`Unsupported task: ${script || 'none'}`)
  process.exit(1)
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

tasks[script].forEach(([workspace, workspaceScript]) => {
  const cwd = path.resolve(__dirname, '..', workspace)
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : npmCommand
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `${npmCommand} run ${workspaceScript}`]
    : ['run', workspaceScript]

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit'
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
})
