NYU Chat App

## Content

- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Clone the repo](#clone-the-repo)
  - [Install dependencies](#install-dependencies)
  - [Set-up ENV Variables](#set-up-env-variables)
- [Automatic commands](#automatic-commands)
  - [postinstall](#postinstall)
- [Commands](#commands)
  - [start](#start)
  - [Build Commands](#build-commands)

## Requirements

- Node
- NPM

## Getting Started

### Clone the repo
```
git clone git@github.com:moxienyc/nyu-chat-app.git nyu-chat-app
```


### Install Dependencies
```
npm install
```

[Download NPM / NodeJS](https://nodejs.org) first if you don't already have it installed globally.

After you finished the installation of the dependencies you must run the
following script to build the dev version and the creation of some dir
where all the asets live.

```
npm run set-up
```

The command will build the assets in `dev` mode.

### Set-up ENV Variables
Edit the config settings in ```config/config.json```. These are committed to git.

You can create a copy called ```config/config.local.json``` which will be loaded instead if it exists. This is not committed to git (it's in .gitignore).

## Automatic commands

This commands are triggered automatically after certain actions on NPM, you don't need to type anything to execute this commands, and are listed here to let you know what's going on on certain actions.

### postinstall

This script is triggered after the command `npm install` and is executed after `npm install` has finished. In this action we run:

1. The installation of the bower dependencies
2. Creation of directories for builds
3. Build of develop assets.

## Commands 

Inside of the projet there are several commands you can use as a build tools and helper commands to compile assets, watch changes and so on, every command are available to use after you have.

### start  

```
npm start
```

This command will allow you to wake up the `http` server, and you will be able to access to the site at `localhost:8000`, the command will be waiting for any response to the server you can run this command on the background or in another tab for preference, you can kill the server at any time just by typing `ctrl + c`.

### Build Commands

Several build commands are included. Each can be run for all file types or just a specific file type.

- Use ```npm run <build_command>``` to run for all file types (where available).
- Use ```npm run <file_type>:<build_command>``` to run for a specific file type [js, styles or templates].

For example:

- Run ```npm run watch``` whilst developing.
- Run ```npm run build``` on the production server.
- Run ```npm run ci``` in Travis.
- Run ```npm run styles:watch``` to only watch scss files whilst developing..
 

The build commands are:

#### ci

```
npm run ci
```

Runs Lint code sniffer on all file types [js and styles].

#### dev

```
npm run dev
```

Creates the dev versions (unminified with sourcemaps) of all file types [js, styles and template].

#### build

```
npm run dev
```

Creates the production versions (minified) of all file types [js, styles and template].

Note that Angular dependencies are automatically injected before minifying. This means there is no need to use ```x.$inject = []```.

#### watch

```
npm run watch
```

Watches for changes on all file types and runs their dev task when detected [js, styles and template].
