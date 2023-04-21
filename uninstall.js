'use strict'

const fs = require('fs')
const path = require('path')
const exists = fs.existsSync || path.existsSync
const root = path.resolve(__dirname, '..', '..')
const git = path.resolve(root, '.git')

const {findHighest, getGitHooksDir, cwd} = require('./install')

async function main() {
  console.log(".")
  console.log("Beginning uninstallation")

  let hooksDir = getGitHooksDir(cwd)
  let existingPreCommitHook = path.resolve(hooksDir, "pre-commit")


  let fileContents = await fs.promises.readFile(existingPreCommitHook)
  let isOurFile = fileContents.cont

  let movedExistingPreCommitHook = await fs.promises.stat(existingPreCommitHook)
    .then(_ => findHighest(hooksDir, "pre-commit.old"))
    .then(highestName => fs.promises.rename(existingPreCommitHook, highestName).then(_ => highestName))
    .catch(_ => "")
}
main.then()

//
// Resolve git directory for submodules
//
if (exists(git) && fs.lstatSync(git).isFile()) {
  var gitinfo = fs.readFileSync(git).toString()
    , gitdirmatch = /gitdir: (.+)/.exec(gitinfo)
    , gitdir = gitdirmatch.length == 2 ? gitdirmatch[1] : null

  if (gitdir !== null) {
    git = path.resolve(root, gitdir)
  }
}

//
// Location of pre-commit hook, if it exists
//
var precommit = path.resolve(git, 'hooks', 'pre-commit')

//
// Bail out if we don't have pre-commit file, it might be removed manually.
//
if (!exists(precommit)) return

//
// If we don't have an old file, we should just remove the pre-commit hook. But
// if we do have an old precommit file we want to restore that.
//
if (!exists(precommit +'.old')) {
  fs.unlinkSync(precommit)
} else {
  fs.writeFileSync(precommit, fs.readFileSync(precommit +'.old'))
  fs.chmodSync(precommit, '755')
  fs.unlinkSync(precommit +'.old')
}
