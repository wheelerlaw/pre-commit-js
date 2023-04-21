'use strict';

const fs = require('fs')
const path = require('path')
const os = require('os')
const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)

// Find the highest filename in the series
const findHighest = util.promisify(function recurse(dir, name, cb, num=1) {
  let higherName = path.resolve(dir, `${name}${num <= 1 ? "" : `-${num}`}`)
  return fs.promises.stat(higherName)
    .then(_ => recurse(dir, name, cb, num+1))
    .catch(_ => cb(undefined, higherName))
})
exports.findHighest = findHighest

const cwd = path.resolve(__dirname, "..")
// const cwd = __dirname
exports.cwd = cwd

const getGitHooksDir = async function(wd) {
  const gitFindHooksDirCommand = "git rev-parse --git-path hooks"
  return await exec(gitFindHooksDirCommand, {cwd: wd})
    .then(res => res.stdout.trim())
    .then(dir => path.resolve(wd, dir))
    .catch(err => console.log(`Something else went wrong: ${err.toString().trim()}`))
}
exports.getGitHooksDir = getGitHooksDir

// Main function definition
async function main() {
  console.log(".")
  console.log("Beginning installation")

  const hooksDir = await getGitHooksDir(cwd)

  if (!hooksDir) {
    console.log("Could not locate git hooks directory")
    return
  }

  let hooksDirStats = await fs.promises.stat(hooksDir)
    .then(stats => ({exists: stats.isDirectory(), message: stats.isDirectory() ? `Found: ${hooksDir}` : `Path ${hooksDir} is not a directory`}))
    .catch(_ => {
      return fs.promises.mkdir(hooksDir)
        .then(_ => ({exists: true, message: `Created: ${hooksDir}`}))
        .catch(err => ({exists: false, message: `Path ${hooksDir} could not be created: ${err}`}))
    })

  console.log(hooksDirStats.message)
  if (!hooksDirStats.exists) {
    console.log("Quitting...")
    return
  }

  let existingPreCommitHook = path.resolve(hooksDir, "pre-commit")
  let movedExistingPreCommitHook = await fs.promises.stat(existingPreCommitHook)
    .then(_ => findHighest(hooksDir, "pre-commit.old"))
    .then(highestName => fs.promises.rename(existingPreCommitHook, highestName).then(_ => highestName))
    .catch(_ => "")

  if (movedExistingPreCommitHook) {
    console.log(`Moved: ${existingPreCommitHook} -> ${movedExistingPreCommitHook}`)
  }

  const preCommitHook = path.resolve(__dirname, "hook")
  let hookRelativeDir = path.relative(hooksDir, preCommitHook)
  if(os.platform() === 'win32') {
    hookRelativeDir = hookRelativeDir.replace(/[\\\/]+/g, '/');
  }

  const preCommitFileContents =
    "#!/usr/bin/env bash\n" +
    `# pre-commit hook for npm\n` +
    `"${hookRelativeDir}"\n` +
    `\n` +
    `# original pre-commit hook\n` +
    `${movedExistingPreCommitHook ? `"${path.relative(existingPreCommitHook, movedExistingPreCommitHook)}"\n` : ''}` +
    `exit $?\n`

  await fs.promises.writeFile(existingPreCommitHook, preCommitFileContents)
    .then(_ => fs.promises.chmod(existingPreCommitHook, "755"))
    .then(_ => console.log(`Created: ${existingPreCommitHook}`))
    .catch(err => console.log(`Couldn't create hook: ${err}`))

  console.log("Done!")
  console.log(".")
}

main().then();
