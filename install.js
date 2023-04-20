'use strict';

//
// Compatibility with older node.js as path.exists got moved to `fs`.
//
const fs = require('fs')
  , path = require('path')
  , os = require('os')
  , util = require('node:util')
  , exec = util.promisify(require('node:child_process').exec)

const {dot} = require("mocha/lib/reporters");

const gitFindHooksDirCommand = "git rev-parse --git-path hooks"


function manuallyGetGitFolderPath(currentPath) {
  const dotGitPath = path.resolve(currentPath, ".git")
  return fs.promises.stat(dotGitPath)
    .then(stats => {
      if (stats.isDirectory()) return dotGitPath
      else {
        console.log(`${dotGitPath} is a file, likely it's a submodule gitfile, searching it for .git directory location`)
        return fs.promises.readFile(dotGitPath)
          .then(file => /^gitdir: (.+)$/gm.exec(file.toString())[1])
          .then(dotGitPath => {
            dotGitPath = path.resolve(dotGitPath)
            console.log(`Found ${dotGitPath} inside submodule gitfile`)
            return dotGitPath
          })
          .catch(_ => "")
      }
    })
    .catch(_ => "")
    .then(potentialPath => {
      if (potentialPath) return path.resolve(potentialPath)
      else {
        console.log(`Not found: ${dotGitPath}`)
        const parentPath = path.resolve(currentPath, "..")
        if (parentPath === currentPath) throw Error("Reached root and couldn't find .git dir")
        else return manuallyGetGitFolderPath(parentPath)
      }
    })
}

async function main() {
  const hooksDir = await exec(gitFindHooksDirCommand)
    .then(res => res.stdout.trim())
    .then(path.resolve)
    .catch(err => {
      console.log("Couldn't get Git hooks directory location using Git:")
      console.log(`> ${process.cwd()}$ ${gitFindHooksDirCommand}`)
      console.log(err.stderr.trim().replace(/^/gm, `> `))

      console.log("Searching up the directory tree for .git...")
      return manuallyGetGitFolderPath('.')
        .then(dotGitPath => {
          return exec(`${gitFindHooksDirCommand} --git-dir=${dotGitPath}`)
            .then(res => res.stdout.trim())
            .catch(err => {
              console.log("Couldn't get Git hooks directory location using Git:")
              console.log(`> ${dotGitPath}$ ${gitFindHooksDirCommand}`)
              console.log(err.stderr.trim().replace(/^/gm, `> `))
            })
        })
        .catch(err => console.log(`Error looking for .git dir: ${err.message}`))
    })
    .catch(err => console.log(`Something else went wrong: ${err}`));


  if (!hooksDir) {
    console.log("Could not locate git hooks directory")
    return
  }

  console.log(`Found: ${hooksDir}`)
  const preCommitHook = path.resolve(__dirname, "pre-commit")
  const hookRelativeDir = path.relative(hooksDir, preCommitHook)
  await fs.promises.mkdir(hooksDir)
    .catch(err => {
      let x = err
    })

}

main().then();
return

const hook = path.join(__dirname, 'hook')
  , root = path.resolve(__dirname, '..', '..')


let hooks = path.resolve(git, 'hooks')
  , precommit = path.resolve(hooks, 'pre-commit');

if (!exists(hooks)) fs.mkdirSync(hooks);

//
// If there's an existing `pre-commit` hook we want to back it up instead of
// overriding it and losing it completely as it might contain something
// important.
//
if (exists(precommit) && !fs.lstatSync(precommit).isSymbolicLink()) {
  console.log('pre-commit:');
  console.log('pre-commit: Detected an existing git pre-commit hook');
  fs.writeFileSync(precommit +'.old', fs.readFileSync(precommit));
  console.log('pre-commit: Old pre-commit hook backuped to pre-commit.old');
  console.log('pre-commit:');
}

//
// We cannot create a symlink over an existing file so make sure it's gone and
// finish the installation process.
//
try { fs.unlinkSync(precommit); }
catch (e) {}

// Create generic precommit hook that launches this modules hook (as well
// as stashing - unstashing the unstaged changes)
// TODO: we could keep launching the old pre-commit scripts
let hookRelativeUnixPath = hook.replace(root, '.');

if(os.platform() === 'win32') {
  hookRelativeUnixPath = hookRelativeUnixPath.replace(/[\\\/]+/g, '/');
}

const precommitContent = '#!/usr/bin/env bash' + os.EOL
    + hookRelativeUnixPath + os.EOL
    + 'RESULT=$?' + os.EOL
    + '[ $RESULT -ne 0 ] && exit 1' + os.EOL
    + 'exit 0' + os.EOL;

//
// It could be that we do not have rights to this folder which could cause the
// installation of this module to completely fail. We should just output the
// error instead destroying the whole npm install process.
//
try { fs.writeFileSync(precommit, precommitContent); }
catch (e) {
  console.error('pre-commit:');
  console.error('pre-commit: Failed to create the hook file in your .git/hooks folder because:');
  console.error('pre-commit: '+ e.message);
  console.error('pre-commit: The hook was not installed.');
  console.error('pre-commit:');
}

try { fs.chmodSync(precommit, '777'); }
catch (e) {
  console.error('pre-commit:');
  console.error('pre-commit: chmod 0777 the pre-commit file in your .git/hooks folder because:');
  console.error('pre-commit: '+ e.message);
  console.error('pre-commit:');
}
