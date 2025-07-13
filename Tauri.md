TITLE Invoke a Tauri command from the JavaScript frontend

DESCRIPTION This JavaScript code illustrates how to call a Rust command from the frontend. It provides examples for both the `@tauri-appsapicore` npm package and the global `window.\_\_TAURI\_\_.core.invoke` object. The `invoke` function takes the command name as its first argument.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_2



LANGUAGE javascript

CODE

```

&nbsp;When using the Tauri API npm package

import { invoke } from '@tauri-appsapicore';



&nbsp;When using the Tauri global script (if not using the npm package)

&nbsp;Be sure to set `app.withGlobalTauri` in `tauri.conf.json` to true

const invoke = window.\_\_TAURI\_\_.core.invoke;



&nbsp;Invoke the command

invoke('my\_custom\_command');

```



----------------------------------------



TITLE Initialize Tauri Application in Rust

DESCRIPTION This Rust code snippet demonstrates the final steps of initializing and running a Tauri application, including context generation and error handling for the application startup.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocslearnwindow-menu.mdx#\_snippet\_6



LANGUAGE Rust

CODE

```

&nbsp;       .run(taurigenerate\_context!())

&nbsp;       .expect(error while running tauri application);

}

```



----------------------------------------



TITLE Define a basic Tauri command in Rust

DESCRIPTION This Rust code defines a simple Tauri command named `my\_custom\_command` within `src-taurisrclib.rs`. Functions annotated with `#\[tauricommand]` can be invoked from the frontend. This example prints a message to the console when called.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_0



LANGUAGE rust

CODE

```

\#\[tauricommand]

fn my\_custom\_command() {

&nbsp;	println!(I was invoked from JavaScript!);

}

```



----------------------------------------



TITLE Define Async Tauri Command with Result for Borrowed Types

DESCRIPTION This Rust example shows an alternative method to handle borrowed types in asynchronous Tauri commands by wrapping the return type in a `Result`. This approach allows the use of borrowed parameters like `\&str` by explicitly handling success and error cases. The return value must be wrapped in `Ok()`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_15



LANGUAGE rust

CODE

```

&nbsp;Return a ResultString, () to bypass the borrowing issue

\#\[tauricommand]

async fn my\_custom\_command(value \&str) - ResultString, () {

&nbsp;	 Call another async function and wait for it to finish

&nbsp;	some\_async\_function().await;

&nbsp;	 Note that the return value must be wrapped in `Ok()` now.

&nbsp;	Ok(format!(value))

}

```



----------------------------------------



TITLE Execute JavaScript in Webview from Rust

DESCRIPTION Shows how to use `WebviewWindow#eval` within a Tauri application's setup hook to directly execute JavaScript code in the webview context, useful for simple interactions or initial scripts.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-frontend.mdx#\_snippet\_5



LANGUAGE rust

CODE

```

use tauriManager;



tauriBuilderdefault()

&nbsp; .setup(app {

&nbsp;   let webview = app.get\_webview\_window(main).unwrap();

&nbsp;   webview.eval(console.log('hello from Rust'));

&nbsp;   Ok(())

&nbsp; })

```



----------------------------------------



TITLE Build Tauri Application

DESCRIPTION Commands to build a Tauri application using various package managers and build tools. This process compiles your application for the target platform.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdistributeindex.mdx#\_snippet\_0



LANGUAGE npm

CODE

```

npm run tauri build

```



LANGUAGE yarn

CODE

```

yarn tauri build

```



LANGUAGE pnpm

CODE

```

pnpm tauri build

```



LANGUAGE deno

CODE

```

deno task tauri build

```



LANGUAGE bun

CODE

```

bun tauri build

```



LANGUAGE cargo

CODE

```

cargo tauri build

```



----------------------------------------



TITLE Using Structured Event Payloads in Rust

DESCRIPTION Expands on the event system by demonstrating how to use custom serializable structs as event payloads. This allows for more complex data to be sent with events. The example defines `DownloadStarted`, `DownloadProgress`, and `DownloadFinished` structs and uses them in an updated `download` command.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-frontend.mdx#\_snippet\_3



LANGUAGE Rust

CODE

```

use tauri{AppHandle, Emitter};

use serdeSerialize;



\#\[derive(Clone, Serialize)]

\#\[serde(rename\_all = camelCase)]

struct DownloadStarted'a {

&nbsp; url \&'a str,

&nbsp; download\_id usize,

&nbsp; content\_length usize,

}



\#\[derive(Clone, Serialize)]

\#\[serde(rename\_all = camelCase)]

struct DownloadProgress {

&nbsp; download\_id usize,

&nbsp; chunk\_length usize,

}



\#\[derive(Clone, Serialize)]

\#\[serde(rename\_all = camelCase)]

struct DownloadFinished {

&nbsp; download\_id usize,

}



\#\[tauricommand]

fn download(app AppHandle, url String) {

&nbsp; let content\_length = 1000;

&nbsp; let download\_id = 1;



&nbsp; app.emit(download-started, DownloadStarted {

&nbsp;   url \&url,

&nbsp;   download\_id,

&nbsp;   content\_length

&nbsp; }).unwrap();



&nbsp; for chunk\_length in \[15, 150, 35, 500, 300] {

&nbsp;   app.emit(download-progress, DownloadProgress {

&nbsp;     download\_id,

&nbsp;     chunk\_length,

&nbsp;   }).unwrap();

&nbsp; }



&nbsp; app.emit(download-finished, DownloadFinished { download\_id }).unwrap();

}

```



----------------------------------------



TITLE Returning Data from Tauri Commands

DESCRIPTION Shows how a Rust command handler can return data, which is then resolved by the JavaScript `invoke` promise. Returned data must implement `serdeSerialize`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_8



LANGUAGE Rust

CODE

```

\#\[tauricommand]

fn my\_custom\_command() - String {

&nbsp;	Hello from Rust!.into()

}

```



LANGUAGE JavaScript

CODE

```

invoke('my\_custom\_command').then((message) = console.log(message));

```



----------------------------------------



TITLE Recreate main.rs to Call Shared Tauri Library

DESCRIPTION After renaming `main.rs` to `lib.rs`, this new `main.rs` file is created to call the shared `run` function from the `app\_lib` crate, ensuring the desktop application still functions correctly.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartmigratefrom-tauri-1.mdx#\_snippet\_2



LANGUAGE rust

CODE

```

\#!\[cfg\_attr(not(debug\_assertions), windows\_subsystem = windows)]



fn main() {

&nbsp; app\_librun();

}

```



----------------------------------------



TITLE Run Tauri Application in Development Mode for Desktop

DESCRIPTION These commands initiate the Tauri development server for desktop applications. The first run may take time for Rust package compilation, but subsequent runs are faster. Once built, the webview opens, and changes to the web app should automatically update.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopindex.mdx#\_snippet\_2



LANGUAGE npm

CODE

```

npm run tauri dev

```



LANGUAGE yarn

CODE

```

yarn tauri dev

```



LANGUAGE pnpm

CODE

```

pnpm tauri dev

```



LANGUAGE deno

CODE

```

deno task tauri dev

```



LANGUAGE bun

CODE

```

bun tauri dev

```



LANGUAGE cargo

CODE

```

cargo tauri dev

```



----------------------------------------



TITLE Interactive Prompts for Tauri Project Scaffolding

DESCRIPTION This snippet illustrates the interactive command-line prompts presented by `create-tauri-app` when scaffolding a new project. It guides the user through selecting a project name, identifier, frontend language (Rust, TypeScriptJavaScript, .NET), package manager (pnpm, yarn, npm, bun), UI template (Vanilla, Vue, Svelte, React, Solid, Angular, Preact, Yew, Leptos, Sycamore, Blazor), and UI flavor (TypeScript, JavaScript).

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartcreate-project.mdx#\_snippet\_0



LANGUAGE CLI

CODE

```

&nbsp;Project name (tauri-app) ›

&nbsp;Identifier (com.tauri-app.app) ›

&nbsp;Choose which language to use for your frontend ›

Rust  (cargo)

TypeScript  JavaScript  (pnpm, yarn, npm, bun)

.NET  (dotnet)

&nbsp;Choose your package manager ›

pnpm

yarn

npm

bun

&nbsp;Choose your UI template ›

Vanilla

Yew

Leptos

Sycamore

&nbsp;Choose your UI template ›

Vanilla

Vue

Svelte

React

Solid

Angular

Preact

&nbsp;Choose your UI flavor ›

TypeScript

JavaScript

&nbsp;Choose your UI template ›

Blazor  (httpsdotnet.microsoft.comen-usappsaspnetweb-appsblazor)

```



----------------------------------------



TITLE Start Tauri Development Server

DESCRIPTION These commands demonstrate how to navigate into the newly created Tauri project directory, install dependencies, and launch the development server using the Tauri CLI. This snippet provides commands tailored for various popular package managers and build tools.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartcreate-project.mdx#\_snippet\_1



LANGUAGE npm

CODE

```

cd tauri-app

npm install

npm run tauri dev

```



LANGUAGE yarn

CODE

```

cd tauri-app

yarn install

yarn tauri dev

```



LANGUAGE pnpm

CODE

```

cd tauri-app

pnpm install

pnpm tauri dev

```



LANGUAGE Deno

CODE

```

cd tauri-app

deno install

deno task tauri dev

```



LANGUAGE Bun

CODE

```

cd tauri-app

bun install

bun tauri dev

```



LANGUAGE Cargo

CODE

```

cd tauri-app

cargo tauri dev

```



----------------------------------------



TITLE Initialize New Tauri Application Project

DESCRIPTION Commands to create a new Tauri application using various shell environments and package managers. These commands download and execute the Tauri app creation script or use the respective package manager's `create` command.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocs\_fragmentscta.mdx#\_snippet\_0



LANGUAGE Bash

CODE

```

sh (curl httpscreate.tauri.appsh)

```



LANGUAGE PowerShell

CODE

```

irm httpscreate.tauri.appps  iex

```



LANGUAGE Fish

CODE

```

sh (curl -sSL httpscreate.tauri.appsh  psub)

```



LANGUAGE npm

CODE

```

npm create tauri-app@latest

```



LANGUAGE Yarn

CODE

```

yarn create tauri-app

```



LANGUAGE pnpm

CODE

```

pnpm create tauri-app

```



LANGUAGE Deno

CODE

```

deno run -A npmcreate-tauri-app

```



LANGUAGE Bun

CODE

```

bun create tauri-app

```



LANGUAGE Cargo

CODE

```

cargo install create-tauri-app --locked

cargo create-tauri-app

```



----------------------------------------



TITLE Create a new Tauri application

DESCRIPTION Commands to initialize a new Tauri project using `create-tauri-app` and the expected interactive prompts for configuration. This sets up the basic project structure for further development.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocslearnSecurityusing-plugin-permissions.mdx#\_snippet\_0



LANGUAGE sh

CODE

```

pnpm create tauri-app

```



LANGUAGE sh

CODE

```

✔ Project name · plugin-permission-demo

✔ Choose which language to use for your frontend · TypeScript  JavaScript - (pnpm, yarn, npm, bun)

✔ Choose your package manager · pnpm

✔ Choose your UI template · Vanilla

✔ Choose your UI flavor · TypeScript



Template created! To get started run

cd plugin-permission-demo

pnpm install

pnpm tauri dev

```



----------------------------------------



TITLE Example Tauri CSP Configuration in tauri.conf.json

DESCRIPTION This JSON snippet demonstrates a Content Security Policy (CSP) configuration within the `tauri.conf.json` file for a Tauri application. It defines various source directives like `default-src`, `connect-src`, `font-src`, `img-src`, and `style-src` to control what resources the webview can load, enhancing security against common web vulnerabilities. This example is taken from Tauri's API example and should be tailored to specific application needs.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocssecuritycsp.mdx#\_snippet\_0



LANGUAGE json

CODE

```

&nbsp; csp {

&nbsp;       default-src 'self' customprotocol asset,

&nbsp;       connect-src ipc httpipc.localhost,

&nbsp;       font-src \[httpsfonts.gstatic.com],

&nbsp;       img-src 'self' asset httpasset.localhost blob data,

&nbsp;       style-src 'unsafe-inline' 'self' httpsfonts.googleapis.com

&nbsp;     },

```



----------------------------------------



TITLE Define and Invoke a Custom Asynchronous Tauri Command with State

DESCRIPTION Provides a comprehensive example of defining an asynchronous Tauri command in Rust. It demonstrates custom response types, state management (`tauriState`), interaction with the window object, and handling asynchronous operations. The snippet also shows how to invoke this command from the JavaScript frontend and process its promise-based response.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_23



LANGUAGE Rust

CODE

```

struct Database;



\#\[derive(serdeSerialize)]

struct CustomResponse {

&nbsp;	message String,

&nbsp;	other\_val usize,

}



async fn some\_other\_function() - OptionString {

&nbsp;	Some(response.into())

}



\#\[tauricommand]

async fn my\_custom\_command(

&nbsp;	window tauriWindow,

&nbsp;	number usize,

&nbsp;	database tauriState'\_, Database,

) - ResultCustomResponse, String {

&nbsp;	println!(Called from {}, window.label());

&nbsp;	let result OptionString = some\_other\_function().await;

&nbsp;	if let Some(message) = result {

&nbsp;		Ok(CustomResponse {

&nbsp;			message,

&nbsp;			other\_val 42 + number,

&nbsp;		})

&nbsp;	} else {

&nbsp;		Err(No result.into())

&nbsp;	}

}



\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;	tauriBuilderdefault()

&nbsp;		.manage(Database {})

&nbsp;		.invoke\_handler(taurigenerate\_handler!\[my\_custom\_command])

&nbsp;		.run(taurigenerate\_context!())

&nbsp;		.expect(error while running tauri application);

}

```



LANGUAGE JavaScript

CODE

```

import { invoke } from '@tauri-appsapicore';



&nbsp;Invocation from JavaScript

invoke('my\_custom\_command', {

&nbsp; number 42,

})

&nbsp; .then((res) =

&nbsp;   console.log(`Message ${res.message}, Other Val ${res.other\_val}`)

&nbsp; )

&nbsp; .catch((e) = console.error(e));

```



----------------------------------------



TITLE Install Dependencies and Run Tauri Project

DESCRIPTION This snippet provides the necessary shell commands to set up and run a Tauri project. It guides the user to navigate into the project directory, install dependencies using pnpm, and then build and run the application in development mode to validate the initial setup.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocslearnsplashscreen.mdx#\_snippet\_0



LANGUAGE sh

CODE

```

cd splashscreen-lab

pnpm install

pnpm tauri dev

```



----------------------------------------



TITLE Handle Command Errors with Rust Result and JavaScript Promise Rejection

DESCRIPTION Demonstrates how a Tauri command in Rust can return a `Result` type to indicate success or failure, and how the corresponding JavaScript `invoke` call handles the promise resolution or rejection based on the Rust `Result`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_10



LANGUAGE Rust

CODE

```

\#\[tauricommand]

fn login(user String, password String) - ResultString, String {

&nbsp;	if user == tauri \&\& password == tauri {

&nbsp;		 resolve

&nbsp;		Ok(logged\_in.to\_string())

&nbsp;	} else {

&nbsp;		 reject

&nbsp;		Err(invalid credentials.to\_string())

&nbsp;	}

}

```



LANGUAGE JavaScript

CODE

```

invoke('login', { user 'tauri', password '0j4rijw8=' })

&nbsp; .then((message) = console.log(message))

&nbsp; .catch((error) = console.error(error));

```



----------------------------------------



TITLE Install Rust on Linux and macOS

DESCRIPTION This command installs Rust and its toolchain manager, rustup, on Linux and macOS systems. It uses a curl-bash pipeline to download and execute the rustup installation script.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartprerequisites.mdx#\_snippet\_8



LANGUAGE sh

CODE

```

curl --proto '=https' --tlsv1.2 httpssh.rustup.rs -sSf  sh

```



----------------------------------------



TITLE Install Tauri CLI Tool

DESCRIPTION Commands to install the Tauri Command Line Interface globally or as a development dependency using various package managers. `cargo` installation is global.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartcreate-project.mdx#\_snippet\_3



LANGUAGE npm

CODE

```

npm install -D @tauri-appscli@latest

```



LANGUAGE yarn

CODE

```

yarn add -D @tauri-appscli@latest

```



LANGUAGE pnpm

CODE

```

pnpm add -D @tauri-appscli@latest

```



LANGUAGE deno

CODE

```

deno add -D npm@tauri-appscli@latest

```



LANGUAGE bun

CODE

```

bun add -D @tauri-appscli@latest

```



LANGUAGE cargo

CODE

```

cargo install tauri-cli --version ^2.0.0 --locked

```



----------------------------------------



TITLE Define Async Tauri Command with String Parameter

DESCRIPTION This Rust example demonstrates how to declare an asynchronous Tauri command. To avoid issues with borrowed types like `\&str` in async functions, the parameter `value` is converted to an owned `String` type. The command calls another async function and returns the processed string.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_14



LANGUAGE rust

CODE

```

&nbsp;Declare the async function using String instead of \&str, as \&str is borrowed and thus unsupported

\#\[tauricommand]

async fn my\_custom\_command(value String) - String {

&nbsp;	 Call another async function and wait for it to finish

&nbsp;	some\_async\_function().await;

&nbsp;	value

}

```



----------------------------------------



TITLE Invoke Async Tauri Command from JavaScript

DESCRIPTION This JavaScript snippet illustrates how to invoke an asynchronous Tauri command from the frontend. Since Tauri commands inherently return a Promise when invoked from JavaScript, handling async commands is straightforward and follows standard Promise-based patterns.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_16



LANGUAGE javascript

CODE

```

invoke('my\_custom\_command', { value 'Hello, Async!' }).then(() =

&nbsp; console.log('Completed!')

);

```



----------------------------------------



TITLE Run Tauri Development Server

DESCRIPTION Commands to start the Tauri development server, which compiles the Rust backend and opens a window displaying the web content. This verifies the setup.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartcreate-project.mdx#\_snippet\_6



LANGUAGE npm

CODE

```

npx tauri dev

```



LANGUAGE yarn

CODE

```

yarn tauri dev

```



LANGUAGE pnpm

CODE

```

pnpm tauri dev

```



LANGUAGE deno

CODE

```

deno task tauri dev

```



LANGUAGE bun

CODE

```

bun tauri dev

```



LANGUAGE cargo

CODE

```

cargo tauri dev

```



----------------------------------------



TITLE Example Tauri Configuration in JSON5 Format

DESCRIPTION This JSON5 snippet illustrates a typical Tauri application configuration, including settings for development URL, pre-dev commands, bundle activation, application icon, window properties, and updater plugin details. It highlights the use of comments supported by JSON5.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopconfiguration-files.mdx#\_snippet\_1



LANGUAGE json5

CODE

```

{

&nbsp; build {

&nbsp;   devUrl 'httplocalhost3000',

&nbsp;    start the dev server

&nbsp;   beforeDevCommand 'npm run dev',

&nbsp; },

&nbsp; bundle {

&nbsp;   active true,

&nbsp;   icon \['iconsapp.png'],

&nbsp; },

&nbsp; app {

&nbsp;   windows \[

&nbsp;     {

&nbsp;       title 'MyApp',

&nbsp;     },

&nbsp;   ],

&nbsp; },

&nbsp; plugins {

&nbsp;   updater {

&nbsp;     pubkey 'updater pub key',

&nbsp;     endpoints \['httpsmy.app.updater{{target}}{{current\_version}}'],

&nbsp;   },

&nbsp; },

}

```



----------------------------------------



TITLE Register Tauri commands in the application builder

DESCRIPTION This Rust code snippet demonstrates how to register defined Tauri commands, such as `my\_custom\_command`, with the application builder in `src-taurisrclib.rs`. The `invoke\_handler` method uses `taurigenerate\_handler!` to make the specified commands accessible from the frontend.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_1



LANGUAGE rust

CODE

```

\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;	tauriBuilderdefault()

&nbsp;		.invoke\_handler(taurigenerate\_handler!\[my\_custom\_command])

&nbsp;		.run(taurigenerate\_context!())

&nbsp;		.expect(error while running tauri application);

}

```



----------------------------------------



TITLE Configure Tauri Development Server with Dev URL and Command

DESCRIPTION This JSON configuration snippet for `tauri.conf.json` sets up the development server. `devUrl` specifies the URL of the frontend development server (e.g., `httplocalhost3000`), and `beforeDevCommand` defines the command to run before starting the development server (e.g., `npm run dev`). This is useful when using UI frameworks or JavaScript bundlers.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopindex.mdx#\_snippet\_0



LANGUAGE json

CODE

```

{

&nbsp; build {

&nbsp;   devUrl httplocalhost3000,

&nbsp;   beforeDevCommand npm run dev

&nbsp; }

}

```



----------------------------------------



TITLE Emit Global Events in Tauri from Frontend

DESCRIPTION Shows how to emit global events from the frontend using `@tauri-appsapievent.emit` or `WebviewWindow#emit`. These events are broadcast to all listeners registered across all webviews.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_24



LANGUAGE JavaScript

CODE

```

import { emit } from '@tauri-appsapievent';

import { getCurrentWebviewWindow } from '@tauri-appsapiwebviewWindow';



&nbsp;emit(eventName, payload)

emit('file-selected', 'pathtofile');



const appWebview = getCurrentWebviewWindow();

appWebview.emit('route-changed', { url window.location.href });

```



----------------------------------------



TITLE Printing Messages to Rust Console in Tauri

DESCRIPTION This snippet illustrates how to output messages directly to the Rust console, which is the terminal where the Tauri application is launched (e.g., via `tauri dev`). Using the `println!` macro, developers can log information from the Rust backend, providing a straightforward way to monitor application flow and debug server-side logic. This is a fundamental tool for understanding the Rust process's behavior.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopDebugindex.mdx#\_snippet\_1



LANGUAGE Rust

CODE

```

println!(Message from Rust {}, msg);

```



----------------------------------------



TITLE Passing Arguments to Tauri Commands

DESCRIPTION Demonstrates how to define a Rust command handler that accepts arguments and how to invoke it from JavaScript, passing arguments as a camelCase JSON object. Arguments in Rust must implement `serdeDeserialize`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_6



LANGUAGE Rust

CODE

```

\#\[tauricommand]

fn my\_custom\_command(invoke\_message String) {

&nbsp;	println!(I was invoked from JavaScript, with this message {}, invoke\_message);

}

```



LANGUAGE JavaScript

CODE

```

invoke('my\_custom\_command', { invokeMessage 'Hello!' });

```



----------------------------------------



TITLE Install Tauri CLI

DESCRIPTION Commands to install the Tauri Command Line Interface (CLI) as a development dependency in your project using various package managers.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsreference\_cli.mdx#\_snippet\_0



LANGUAGE npm

CODE

```

npm install --save-dev @tauri-appscli@latest

```



LANGUAGE yarn

CODE

```

yarn add -D @tauri-appscli@latest

```



LANGUAGE pnpm

CODE

```

pnpm add -D @tauri-appscli@latest

```



LANGUAGE deno

CODE

```

deno add -D npm@tauri-appscli@latest

```



LANGUAGE cargo

CODE

```

cargo install tauri-cli --version ^2.0.0 --locked

```



----------------------------------------



TITLE Define Default Tauri Capability JSON

DESCRIPTION This JSON snippet defines a default capability file for a Tauri application, allowing the main window to use core plugin functionalities and specific window APIs like `setTitle`. It's typically placed in `src-tauricapabilities`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocssecuritycapabilities.mdx#\_snippet\_0



LANGUAGE json

CODE

```

{

&nbsp; $schema ..genschemasdesktop-schema.json,

&nbsp; identifier main-capability,

&nbsp; description Capability for the main window,

&nbsp; windows \[main],

&nbsp; permissions \[

&nbsp;   corepathdefault,

&nbsp;   coreeventdefault,

&nbsp;   corewindowdefault,

&nbsp;   coreappdefault,

&nbsp;   coreresourcesdefault,

&nbsp;   coremenudefault,

&nbsp;   coretraydefault,

&nbsp;   corewindowallow-set-title

&nbsp; ]

}

```



----------------------------------------



TITLE Initialize Tauri Backend

DESCRIPTION Commands to initialize the Tauri backend within an existing project directory. This step prompts the user for application details like name, window title, web assets location, and development server URLs.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsstartcreate-project.mdx#\_snippet\_4



LANGUAGE npm

CODE

```

npx tauri init

```



LANGUAGE yarn

CODE

```

yarn tauri init

```



LANGUAGE pnpm

CODE

```

pnpm tauri init

```



LANGUAGE deno

CODE

```

deno task tauri init

```



LANGUAGE bun

CODE

```

bun tauri init

```



LANGUAGE cargo

CODE

```

cargo tauri init

```



----------------------------------------



TITLE Example Tauri Configuration in TOML Format

DESCRIPTION This TOML snippet provides an equivalent Tauri configuration to the JSON5 example, showcasing how build settings, bundle options, window definitions, and updater plugin configurations are structured using TOML syntax, including comments and kebab-case for field names.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopconfiguration-files.mdx#\_snippet\_2



LANGUAGE toml

CODE

```

\[build]

dev-url = httplocalhost3000

\# start the dev server

before-dev-command = npm run dev



\[bundle]

active = true

icon = \[iconsapp.png]



\[\[app.windows]]

title = MyApp



\[plugins.updater]

pubkey = updater pub key

endpoints = \[httpsmy.app.updater{{target}}{{current\_version}}]

```



----------------------------------------



TITLE Configure Cross-Origin Headers in Vite-based Frameworks

DESCRIPTION This snippet demonstrates how to add specific cross-origin and custom headers to the `vite.config.ts` file for projects using Vite as their build tool, including Qwik, React, Solid, Svelte, and Vue. These headers are crucial for enabling certain browser features and custom Tauri communication.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocssecurityhttp-headers.mdx#\_snippet\_2



LANGUAGE typescript

CODE

```

import { defineConfig } from 'vite';



export default defineConfig({

&nbsp;  ...

&nbsp; server {

&nbsp;      ...

&nbsp;     headers {

&nbsp;       'Cross-Origin-Opener-Policy' 'same-origin',

&nbsp;       'Cross-Origin-Embedder-Policy' 'require-corp',

&nbsp;       'Timing-Allow-Origin' 'httpsdeveloper.mozilla.org, httpsexample.com',

&nbsp;       'Access-Control-Expose-Headers' 'Tauri-Custom-Header',

&nbsp;       'Tauri-Custom-Header' key1 'value1' 'value2'; key2 'value3'

&nbsp;     },

&nbsp;   },

})

```



----------------------------------------



TITLE GitHub Actions Workflow for Tauri App Release

DESCRIPTION This YAML configuration defines a GitHub Actions workflow named 'publish' that automates the build and release of a Tauri application. It runs on push to the 'release' branch or via manual workflow dispatch. The workflow builds for macOS (Intel and Arm), Ubuntu, and Windows, handling platform-specific dependencies, Node.js setup, Rust toolchain installation, frontend dependency management, and uses `tauri-action` to generate release artifacts and create a GitHub release.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdistributePipelinesgithub.mdx#\_snippet\_1



LANGUAGE YAML

CODE

```

name 'publish'



on

&nbsp; workflow\_dispatch

&nbsp; push

&nbsp;   branches

&nbsp;     - release



jobs

&nbsp; publish-tauri

&nbsp;   permissions

&nbsp;     contents write

&nbsp;   strategy

&nbsp;     fail-fast false

&nbsp;     matrix

&nbsp;       include

&nbsp;         - platform 'macos-latest' # for Arm based macs (M1 and above).

&nbsp;           args '--target aarch64-apple-darwin'

&nbsp;         - platform 'macos-latest' # for Intel based macs.

&nbsp;           args '--target x86\_64-apple-darwin'

&nbsp;         - platform 'ubuntu-22.04'

&nbsp;           args ''

&nbsp;         - platform 'windows-latest'

&nbsp;           args ''



&nbsp;   runs-on ${{ matrix.platform }}

&nbsp;   steps

&nbsp;     - uses actionscheckout@v4



&nbsp;     - name install dependencies (ubuntu only)

&nbsp;       if matrix.platform == 'ubuntu-22.04' # This must match the platform value defined above.

&nbsp;       run 

&nbsp;         sudo apt-get update

&nbsp;         sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf



&nbsp;     - name setup node

&nbsp;       uses actionssetup-node@v4

&nbsp;       with

&nbsp;         node-version lts

&nbsp;         cache 'yarn' # Set this to npm, yarn or pnpm.



&nbsp;     - name install Rust stable

&nbsp;       uses dtolnayrust-toolchain@stable # Set this to dtolnayrust-toolchain@nightly

&nbsp;       with

&nbsp;         # Those targets are only used on macos runners so it's in an `if` to slightly speed up windows and linux builds.

&nbsp;         targets ${{ matrix.platform == 'macos-latest' \&\& 'aarch64-apple-darwin,x86\_64-apple-darwin'  '' }}



&nbsp;     - name Rust cache

&nbsp;       uses swatinemrust-cache@v2

&nbsp;       with

&nbsp;         workspaces '.src-tauri - target'



&nbsp;     - name install frontend dependencies

&nbsp;       # If you don't have `beforeBuildCommand` configured you may want to build your frontend here too.

&nbsp;       run yarn install # change this to npm or pnpm depending on which one you use.



&nbsp;     - uses tauri-appstauri-action@v0

&nbsp;       env

&nbsp;         GITHUB\_TOKEN ${{ secrets.GITHUB\_TOKEN }}

&nbsp;       with

&nbsp;         tagName app-v\_\_VERSION\_\_ # the action automatically replaces \_\_VERSION\_\_ with the app version.

&nbsp;         releaseName 'App v\_\_VERSION\_\_'

&nbsp;         releaseBody 'See the assets to download this version and install.'

&nbsp;         releaseDraft true

&nbsp;         prerelease false

&nbsp;         args ${{ matrix.args }}

```



----------------------------------------



TITLE Configure Global File System Scope in Tauri default.json

DESCRIPTION This JSON configuration snippet demonstrates how to apply a global file system scope using the `fsscope` permission in `src-tauricapabilitiesdefault.json`. It grants access to the application's data directory (`$APPDATA`) and all its subdirectories for all `fs` commands.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginfile-system.mdx#\_snippet\_36



LANGUAGE json

CODE

```

{

&nbsp; $schema ..genschemasdesktop-schema.json,

&nbsp; identifier main-capability,

&nbsp; description Capability for the main window,

&nbsp; windows \[main],

&nbsp; permissions \[

&nbsp;   {

&nbsp;     identifier fsscope,

&nbsp;     allow \[{ path $APPDATA }, { path $APPDATA }]

&nbsp;   }

&nbsp; ]

}

```



----------------------------------------



TITLE Read Text File (Tauri FS Plugin)

DESCRIPTION Demonstrates reading the entire content of a text file using `readTextFile` from `@tauri-appsplugin-fs`. It reads 'config.toml' from the AppConfig directory.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginfile-system.mdx#\_snippet\_19



LANGUAGE js

CODE

```

import { readTextFile, BaseDirectory } from '@tauri-appsplugin-fs';

const configToml = await readTextFile('config.toml', {

&nbsp; baseDir BaseDirectory.AppConfig,

});

```



----------------------------------------



TITLE Tauri Store Basic Usage Example

DESCRIPTION Demonstrates how to create, set, get, and save data using the Tauri Store plugin in both JavaScriptTypeScript and Rust, highlighting asynchronous operations and data serialization requirements.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginstore.mdx#\_snippet\_3



LANGUAGE TypeScript

CODE

```

import { load } from '@tauri-appsplugin-store';

&nbsp;when using `withGlobalTauri true`, you may use

&nbsp;const { load } = window.\_\_TAURI\_\_.store;



&nbsp;Create a new store or load the existing one,

&nbsp;note that the options will be ignored if a `Store` with that path has already been created

const store = await load('store.json', { autoSave false });



&nbsp;Set a value.

await store.set('some-key', { value 5 });



&nbsp;Get a value.

const val = await store.get{ value number }('some-key');

console.log(val);  { value 5 }



&nbsp;You can manually save the store after making changes.

&nbsp;Otherwise, it will save upon graceful exit

&nbsp;And if you set `autoSave` to a number or left empty,

&nbsp;it will save the changes to disk after a debounce delay, 100ms by default.

await store.save();

```



LANGUAGE Rust

CODE

```

use tauriWry;

use tauri\_plugin\_storeStoreExt;

use serde\_jsonjson;



\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;   tauriBuilderdefault()

&nbsp;       .plugin(tauri\_plugin\_storeBuilderdefault().build())

&nbsp;       .setup(app {

&nbsp;            Create a new store or load the existing one

&nbsp;            this also put the store in the app's resource table

&nbsp;            so your following calls `store` calls (from both rust and js)

&nbsp;            will reuse the same store

&nbsp;           let store = app.store(store.json);



&nbsp;            Note that values must be serde\_jsonValue instances,

&nbsp;            otherwise, they will not be compatible with the JavaScript bindings.

&nbsp;           store.set(some-key, json!({ value 5 }));



&nbsp;            Get a value from the store.

&nbsp;           let value = store.get(some-key).expect(Failed to get value from store);

&nbsp;           println!({}, value);  {value5}



&nbsp;            Remove the store from the resource table

&nbsp;           store.close\_resource();



&nbsp;           Ok(())

&nbsp;       })

&nbsp;       .run(taurigenerate\_context!())

&nbsp;       .expect(error while running tauri application);

}

```



----------------------------------------



TITLE Listen to All Tauri Events Including Webview-Specific

DESCRIPTION Explains how to configure an event listener in JavaScript to catch all emitted events, including webview-specific ones. This is achieved by setting the `{ target { kind 'Any' } }` option in the `listen` function from `@tauri-appsapievent`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_26



LANGUAGE JavaScript

CODE

```

import { listen } from '@tauri-appsapievent';

listen(

&nbsp; 'state-changed',

&nbsp; (event) = {

&nbsp;   console.log('got state changed event', event);

&nbsp; },

&nbsp; {

&nbsp;   target { kind 'Any' },

&nbsp; }

);

```



----------------------------------------



TITLE Accessing Managed State in Async Tauri Commands

DESCRIPTION Illustrates how to access and modify `Mutex`-wrapped state within an asynchronous Tauri command. It uses `await` for the mutex lock, suitable for `tokiosyncMutex` or when holding the lock across `await` points.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopstate-management.mdx#\_snippet\_5



LANGUAGE rust

CODE

```

\#\[tauricommand]

async fn increase\_counter(state State'\_, MutexAppState) - Resultu32, () {

&nbsp; let mut state = state.lock().await;

&nbsp; state.counter += 1;

&nbsp; Ok(state.counter)

}

```



----------------------------------------



TITLE Access Managed State in Tauri Commands

DESCRIPTION This Rust example illustrates how to define and access application-wide managed state within Tauri commands using `tauriState`. State is registered with `tauriBuildermanage` during application setup, allowing commands to retrieve and use shared data throughout the application's lifecycle.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_20



LANGUAGE rust

CODE

```

struct MyState(String);



\#\[tauricommand]

fn my\_custom\_command(state tauriStateMyState) {

&nbsp;	assert\_eq!(state.0 == some state value, true);

}



\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;	tauriBuilderdefault()

&nbsp;		.manage(MyState(some state value.into()))

&nbsp;		.invoke\_handler(taurigenerate\_handler!\[my\_custom\_command])

&nbsp;		.run(taurigenerate\_context!())

&nbsp;		.expect(error while running tauri application);

}

```



----------------------------------------



TITLE Configure Shell Command Permissions in Tauri Capabilities

DESCRIPTION JSON configuration snippet for `default.json` demonstrating how to define and allow specific shell commands and their arguments within Tauri's capabilities for security.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginshell.mdx#\_snippet\_6



LANGUAGE JSON

CODE

```

{

&nbsp; $schema ..genschemasdesktop-schema.json,

&nbsp; identifier main-capability,

&nbsp; description Capability for the main window,

&nbsp; windows \[main],

&nbsp; permissions \[

&nbsp;   {

&nbsp;     identifier shellallow-execute,

&nbsp;     allow \[

&nbsp;       {

&nbsp;         name exec-sh,

&nbsp;         cmd sh,

&nbsp;         args \[

&nbsp;           -c,

&nbsp;           {

&nbsp;             validator S+

&nbsp;           }

&nbsp;         ],

&nbsp;         sidecar false

&nbsp;       }

&nbsp;     ]

&nbsp;   }

&nbsp; ]

}

```



----------------------------------------



TITLE Define Inline Tauri Capabilities in Configuration

DESCRIPTION This `tauri.conf.json` snippet shows how to define capabilities directly within the configuration file, including an inline capability definition alongside a reference to an external one. This allows for flexible capability management.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocssecuritycapabilities.mdx#\_snippet\_2



LANGUAGE json

CODE

```

{

&nbsp; app {

&nbsp;   security {

&nbsp;     capabilities \[

&nbsp;       {

&nbsp;         identifier my-capability,

&nbsp;         description My application capability used for all windows,

&nbsp;         windows \[],

&nbsp;         permissions \[fsdefault, allow-home-read-extended]

&nbsp;       },

&nbsp;       my-second-capability

&nbsp;     ]

&nbsp;   }

&nbsp; }

}

```



----------------------------------------



TITLE Create and Manage System Tray at Runtime in Tauri

DESCRIPTION Example demonstrating how to create a system tray at runtime using Tauri's `SystemTray` API, including menu setup, event handling for menu item clicks, and managing the tray's lifetime.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsblogtauri-1-1.mdx#\_snippet\_2



LANGUAGE rust

CODE

```

use tauri{Builder, CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu};

Builderdefault()

&nbsp;   .setup(app {

&nbsp;       let handle = app.handle();

&nbsp;       SystemTraynew()

&nbsp;           .with\_id(main)

&nbsp;           .with\_menu(

&nbsp;               SystemTrayMenunew().add\_item(CustomMenuItemnew(quit, Quit))

&nbsp;           )

&nbsp;           .on\_event(move event {

&nbsp;               let tray\_handle = handle.tray\_handle\_by\_id(main).unwrap();

&nbsp;               if let SystemTrayEventMenuItemClick { id, .. } = event {

&nbsp;                   if id == quit {

&nbsp;                       tray\_handle.destroy().unwrap();

&nbsp;                   }

&nbsp;               }

&nbsp;           })

&nbsp;           .build(\&handle)

&nbsp;           .expect(unable to create tray);

&nbsp;   });

```



----------------------------------------



TITLE Check Directory Existence with Tauri FS Plugin

DESCRIPTION The `exists` function checks whether a specified file or directory exists at the given path. This example checks for the existence of an 'images' directory.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginfile-system.mdx#\_snippet\_31



LANGUAGE js

CODE

```

import { exists, BaseDirectory } from '@tauri-appsplugin-fs';

const tokenExists = await exists('images', {

&nbsp; baseDir BaseDirectory.AppLocalData,

});

```



----------------------------------------



TITLE Copy File (Tauri FS Plugin)

DESCRIPTION Shows how to copy a file from a source to a destination path using `copyFile` from `@tauri-appsplugin-fs`. Note that you must configure each base directory separately. It copies 'user.db' from AppLocalData to 'user.db.bk' in the Temp directory.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginfile-system.mdx#\_snippet\_23



LANGUAGE js

CODE

```

import { copyFile, BaseDirectory } from '@tauri-appsplugin-fs';

await copyFile('user.db', 'user.db.bk', {

&nbsp; fromPathBaseDir BaseDirectory.AppLocalData,

&nbsp; toPathBaseDir BaseDirectory.Temp,

});

```



----------------------------------------



TITLE Mocking Simple IPC Invoke Calls in Vitest

DESCRIPTION This snippet demonstrates how to mock a simple IPC `invoke` call using `mockIPC` in a Vitest test environment. It sets up a mock for a Rust command named add that performs addition, and includes a `beforeAll` hook to polyfill `window.crypto` for jsdom compatibility.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopTestsmocking.md#\_snippet\_0



LANGUAGE javascript

CODE

```

import { beforeAll, expect, test } from vitest;

import { randomFillSync } from crypto;



import { mockIPC } from @tauri-appsapimocks;

import { invoke } from @tauri-appsapicore;



&nbsp;jsdom doesn't come with a WebCrypto implementation

beforeAll(() = {

&nbsp; Object.defineProperty(window, 'crypto', {

&nbsp;   value {

&nbsp;      @ts-ignore

&nbsp;     getRandomValues (buffer) = {

&nbsp;       return randomFillSync(buffer);

&nbsp;     },

&nbsp;   },

&nbsp; });

});





test(invoke simple, async () = {

&nbsp; mockIPC((cmd, args) = {

&nbsp;    simulated rust command called add that just adds two numbers

&nbsp;   if(cmd === add) {

&nbsp;     return (args.a as number) + (args.b as number);

&nbsp;   }

&nbsp; });

});

```



----------------------------------------



TITLE Listen to Global Events in Tauri Frontend (TypeScript)

DESCRIPTION Demonstrates how to register a listener for global events using `@tauri-appsapievent` in a Tauri frontend application. It defines a type for the event payload and logs the received data.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelop\_sectionsfrontend-listen.mdx#\_snippet\_0



LANGUAGE TypeScript

CODE

```

import { listen } from '@tauri-appsapievent';



type DownloadStarted = {

&nbsp; url string;

&nbsp; downloadId number;

&nbsp; contentLength number;

};



listenDownloadStarted('download-started', (event) = {

&nbsp; console.log(

&nbsp;   `downloading ${event.payload.contentLength} bytes from ${event.payload.url}`

&nbsp; );

});

```



----------------------------------------



TITLE Configure Default Tauri Application Capabilities

DESCRIPTION This JSON snippet illustrates how to define default capabilities for a Tauri application, specifically focusing on file system permissions. It shows how to enable a broad `fsdefault` permission and a more granular `fsallow-exists` permission, restricted to paths within the application's data directory (`$APPDATA`). This configuration is essential for controlling what resources the application can access.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginfile-system.mdx#\_snippet\_35



LANGUAGE json

CODE

```

{

&nbsp; $schema ..genschemasdesktop-schema.json,

&nbsp; identifier main-capability,

&nbsp; description Capability for the main window,

&nbsp; windows \[main],

&nbsp; permissions \[

&nbsp;   fsdefault,

&nbsp;   {

&nbsp;     identifier fsallow-exists,

&nbsp;     allow \[{ path $APPDATA }]

&nbsp;   }

&nbsp; ]

}

```



----------------------------------------



TITLE Serialize Custom Errors with Structured `serde` Tags for Frontend Mapping

DESCRIPTION Demonstrates an advanced custom error type that uses `serde` attributes (`tag`, `content`, `rename\_all`) to serialize errors into a structured object (`{ kind 'io'  'utf8', message string }`), facilitating easier mapping to TypeScript enums on the frontend.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_13



LANGUAGE Rust

CODE

```

\#\[derive(Debug, thiserrorError)]

enum Error {

&nbsp; #\[error(transparent)]

&nbsp; Io(#\[from] stdioError),

&nbsp; #\[error(failed to parse as string {0})]

&nbsp; Utf8(#\[from] stdstrUtf8Error),

}



\#\[derive(serdeSerialize)]

\#\[serde(tag = kind, content = message)]

\#\[serde(rename\_all = camelCase)]

enum ErrorKind {

&nbsp; Io(String),

&nbsp; Utf8(String),

}



impl serdeSerialize for Error {

&nbsp; fn serializeS(\&self, serializer S) - ResultSOk, SError

&nbsp; where

&nbsp;   S serdeserSerializer,

&nbsp; {

&nbsp;   let error\_message = self.to\_string();

&nbsp;   let error\_kind = match self {

&nbsp;     SelfIo(\_) = ErrorKindIo(error\_message),

&nbsp;     SelfUtf8(\_) = ErrorKindUtf8(error\_message),

&nbsp;   };

&nbsp;   error\_kind.serialize(serializer)

&nbsp; }

}



\#\[tauricommand]

fn read() - ResultVecu8, Error {

&nbsp; let data = stdfsread(pathtofile);

&nbsp;	Ok(data)

}

```



LANGUAGE TypeScript

CODE

```

type ErrorKind = {

&nbsp; kind 'io'  'utf8';

&nbsp; message string;

};



invoke('read').catch((e ErrorKind) = {});

```



----------------------------------------



TITLE Simplified Tauri Core Default Permissions

DESCRIPTION Example of the new 'coredefault' permission set. This simplifies configuration by including all default permissions for core plugins, reducing boilerplate in the capabilities configuration.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsblogtauri-2-0-0-release-candidate.mdx#\_snippet\_3



LANGUAGE json

CODE

```

...

permissions \[

&nbsp;   coredefault

]

...

```



----------------------------------------



TITLE Initialize Tauri Updater Plugin in Rust Application

DESCRIPTION Modifies the `lib.rs` file to initialize and register the `tauri-plugin-updater` within the Tauri application setup, ensuring it's built for desktop environments.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginupdater.mdx#\_snippet\_2



LANGUAGE rust

CODE

```

\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;   tauriBuilderdefault()

&nbsp;       .setup(app {

&nbsp;           #\[cfg(desktop)]

&nbsp;           app.handle().plugin(tauri\_plugin\_updaterBuildernew().build());

&nbsp;           Ok(())

&nbsp;       })

&nbsp;       .run(taurigenerate\_context!())

&nbsp;       .expect(error while running tauri application);

}

```



----------------------------------------



TITLE Initialize Tauri SQL Plugin in Rust Application

DESCRIPTION Rust code snippet demonstrating how to initialize the `tauri-plugin-sql` plugin within the `tauriBuilder` in `src-taurisrclib.rs`.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginsql.mdx#\_snippet\_2



LANGUAGE rust

CODE

```

\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;   tauriBuilderdefault()

&nbsp;       .plugin(tauri\_plugin\_sqlBuilderdefault().build())

&nbsp;       .run(taurigenerate\_context!())

&nbsp;       .expect(error while running tauri application);

}

```



----------------------------------------



TITLE Tauri Core Webview Default Permissions

DESCRIPTION This section specifies the permissions that are automatically included when the `corewebviewdefault` permission is granted. These permissions provide access to fundamental webview operations such as retrieving all active webviews, and controlling their position, size, and developer tools.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsreferenceaclcore-permissions.mdx#\_snippet\_14



LANGUAGE APIDOC

CODE

```

corewebviewdefault includes

\- allow-get-all-webviews

\- allow-webview-position

\- allow-webview-size

\- allow-internal-toggle-devtools

```



----------------------------------------



TITLE Initialize Tauri Plugin in Rust Application

DESCRIPTION Rust code demonstrating how to initialize a custom Tauri plugin within the application's backend. It conditionally registers Android and iOS plugins based on the target operating system, allowing the Rust core to interact with native mobile functionalities provided by the respective platform-specific plugin implementations.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsblogtauri-2-0-0-alpha-4.mdx#\_snippet\_4



LANGUAGE rust

CODE

```

use tauri{

&nbsp; plugin{Builder, TauriPlugin},

&nbsp; Manager, Runtime,

};



\#\[cfg(target\_os = ios)]

tauriios\_plugin\_binding!(init\_plugin\_example);



pub fn initR Runtime() - TauriPluginR {

&nbsp; Buildernew(example)

&nbsp;   .setup(app, api {

&nbsp;     #\[cfg(target\_os = android)]

&nbsp;     api.register\_android\_plugin(com.plugin.example, ExamplePlugin);

&nbsp;     #\[cfg(target\_os = ios)]

&nbsp;     api.register\_ios\_plugin(init\_plugin\_example);

&nbsp;     Ok(())

&nbsp;   })

&nbsp;   .build()

}

```



----------------------------------------



TITLE Tauri Application Setup with Updater Plugin and Update Management

DESCRIPTION This Rust code snippet illustrates the core setup of a Tauri application, including the initialization of the `tauri\_plugin\_process` and `tauri\_plugin\_updater` plugins. It defines a `PendingUpdate` struct for managing update states and registers `fetch\_update` and `install\_update` as invoke handlers for desktop builds, demonstrating how to integrate update functionality into the application lifecycle.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginupdater.mdx#\_snippet\_20



LANGUAGE Rust

CODE

```

&nbsp;                   started = true;

&nbsp;               }



&nbsp;               let \_ = on\_event.send(DownloadEventProgress { chunk\_length });

&nbsp;           },

&nbsp;            {

&nbsp;               let \_ = on\_event.send(DownloadEventFinished);

&nbsp;           },

&nbsp;       )

&nbsp;       .await;



&nbsp;   Ok(())

}



struct PendingUpdate(MutexOptionUpdate);

}



\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;   tauriBuilderdefault()

&nbsp;       .plugin(tauri\_plugin\_processinit())

&nbsp;       .setup(app {

&nbsp;           #\[cfg(desktop)]

&nbsp;           {

&nbsp;               app.handle().plugin(tauri\_plugin\_updaterBuildernew().build());

&nbsp;               app.manage(app\_updatesPendingUpdate(Mutexnew(None)));

&nbsp;           }

&nbsp;           Ok(())

&nbsp;       })

&nbsp;       .invoke\_handler(taurigenerate\_handler!\[

&nbsp;           #\[cfg(desktop)]

&nbsp;           app\_updatesfetch\_update,

&nbsp;           #\[cfg(desktop)]

&nbsp;           app\_updatesinstall\_update

&nbsp;       ])

}

```



----------------------------------------



TITLE Register Multiple Tauri Commands in a Single Handler

DESCRIPTION Illustrates the correct way to register multiple Tauri commands in Rust. Commands must be passed as an array to a single `taurigenerate\_handler!` macro call within the `invoke\_handler` to ensure all commands are properly registered and available.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_22



LANGUAGE Rust

CODE

```

\#\[tauricommand]

fn cmd\_a() - String {

&nbsp;	Command a

}

\#\[tauricommand]

fn cmd\_b() - String {

&nbsp;	Command b

}



\#\[cfg\_attr(mobile, taurimobile\_entry\_point)]

pub fn run() {

&nbsp;	tauriBuilderdefault()

&nbsp;		.invoke\_handler(taurigenerate\_handler!\[cmd\_a, cmd\_b])

&nbsp;		.run(taurigenerate\_context!())

&nbsp;		.expect(error while running tauri application);

}

```



----------------------------------------



TITLE Execute Shell Command in Rust

DESCRIPTION Example demonstrating how to use `tauri\_plugin\_shellShellExt` to execute a shell command and process its output in Rust.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginshell.mdx#\_snippet\_5



LANGUAGE Rust

CODE

```

use tauri\_plugin\_shellShellExt;



let shell = app\_handle.shell();

let output = tauriasync\_runtimeblock\_on(async move {

&nbsp;		shell

&nbsp;				.command(echo)

&nbsp;				.args(\[Hello from Rust!])

&nbsp;				.output()

&nbsp;				.await

&nbsp;				.unwrap()

});

if output.status.success() {

&nbsp;		println!(Result {}, Stringfrom\_utf8(output.stdout));

} else {

&nbsp;		println!(Exit with code {}, output.status.code().unwrap());

}

```



----------------------------------------



TITLE Managing Mutable Application State with Rust Mutex in Tauri

DESCRIPTION Illustrates how to use `stdsyncMutex` to wrap application state, enabling safe mutable access across threads in a Tauri application. The `Mutex` ensures data integrity by allowing only one thread to modify the state at a time.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopstate-management.mdx#\_snippet\_2



LANGUAGE rust

CODE

```

use stdsyncMutex;



use tauri{Builder, Manager};



\#\[derive(Default)]

struct AppState {

&nbsp; counter u32,

}



fn main() {

&nbsp; Builderdefault()

&nbsp;   .setup(app {

&nbsp;     app.manage(Mutexnew(AppStatedefault()));

&nbsp;     Ok(())

&nbsp;   })

&nbsp;   .run(taurigenerate\_context!())

&nbsp;   .unwrap();

}

```



----------------------------------------



TITLE Triggering Global Events in Rust

DESCRIPTION Demonstrates how to emit a global event from a Rust Tauri command using `AppHandleemit`. This event is delivered to all registered listeners across all webviews. The example shows emitting 'download-started', 'download-progress', and 'download-finished' events with a URL and progress updates.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-frontend.mdx#\_snippet\_0



LANGUAGE Rust

CODE

```

use tauri{AppHandle, Emitter};



\#\[tauricommand]

fn download(app AppHandle, url String) {

&nbsp; app.emit(download-started, \&url).unwrap();

&nbsp; for progress in \[1, 15, 50, 80, 100] {

&nbsp;   app.emit(download-progress, progress).unwrap();

&nbsp; }

&nbsp; app.emit(download-finished, \&url).unwrap();

}

```



----------------------------------------



TITLE Access AppHandle Instance in Tauri Command

DESCRIPTION This Rust example demonstrates how to obtain and utilize the `AppHandle` instance within a Tauri command. The `AppHandle` provides access to global application functionalities, such as path resolution or managing global shortcuts, independent of a specific window.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopcalling-rust.mdx#\_snippet\_19



LANGUAGE rust

CODE

```

\#\[tauricommand]

async fn my\_custom\_command(app\_handle tauriAppHandle) {

&nbsp;	let app\_dir = app\_handle.path\_resolver().app\_dir();

&nbsp;	use tauriGlobalShortcutManager;

&nbsp;	app\_handle.global\_shortcut\_manager().register(CTRL + U, move  {});

}

```



----------------------------------------



TITLE Read Resource File with plugin-fs in JavaScript

DESCRIPTION This JavaScript snippet demonstrates how to read a resource file bundled with the Tauri application. It uses `resolveResource` from `@tauri-appsapipath` to get the absolute path to a resource and `readTextFile` from `@tauri-appsplugin-fs` to read its content. The content is then parsed as JSON.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopresources.mdx#\_snippet\_7



LANGUAGE javascript

CODE

```

import { resolveResource } from '@tauri-appsapipath';

import { readTextFile } from '@tauri-appsplugin-fs';



const resourcePath = await resolveResource('langde.json');

const langDe = JSON.parse(await readTextFile(resourcePath));

console.log(langDe.hello);  This will print 'Guten Tag!' to the devtools console

```



----------------------------------------



TITLE Execute Tauri Sidecar with Arguments

DESCRIPTION These code snippets demonstrate how to execute a Tauri sidecar while passing arguments, as configured in the capabilities file. The Rust example uses `ShellExt` and `sidecar().args()` within an async command, while the JavaScript example passes an array of arguments directly to `Command.sidecar()`. Both examples show how to match the arguments defined in the `default.json` capabilities.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocsdevelopsidecar.mdx#\_snippet\_9



LANGUAGE rust

CODE

```

use tauri\_plugin\_shellShellExt;

\#\[tauricommand]

async fn call\_my\_sidecar(app tauriAppHandle) {

&nbsp; let sidecar\_command = app

&nbsp;   .shell()

&nbsp;   .sidecar(my-sidecar)

&nbsp;   .unwrap()

&nbsp;   .args(\[arg1, -a, --arg2, any-string-that-matches-the-validator]);

&nbsp; let (mut \_rx, mut \_child) = sidecar\_command.spawn().unwrap();

}

```



LANGUAGE javascript

CODE

```

import { Command } from '@tauri-appsplugin-shell';

&nbsp;notice that the args array matches EXACTLY what is specified in `capabilitiesdefault.json`.

const command = Command.sidecar('binariesmy-sidecar', \[

&nbsp; 'arg1',

&nbsp; '-a',

&nbsp; '--arg2',

&nbsp; 'any-string-that-matches-the-validator',

]);

const output = await command.execute();

```



----------------------------------------



TITLE Configure Tauri Log Plugin for Webview Console

DESCRIPTION This snippet demonstrates how to configure the Tauri log plugin to output Rust logs directly to the webview's developer console. It includes both the Rust backend setup for enabling the Webview target and the JavaScript frontend code to attach and detach the console listener.

SOURCE httpsgithub.comtauri-appstauri-docsblobv2srccontentdocspluginlogging.mdx#\_snippet\_12



LANGUAGE Rust

CODE

```

tauri\_plugin\_logBuildernew()

&nbsp; .target(tauri\_plugin\_logTargetnew(

&nbsp;   tauri\_plugin\_logTargetKindWebview,

&nbsp; ))

&nbsp; .build()

```



LANGUAGE JavaScript

CODE

```

import { attachConsole } from '@tauri-appsplugin-log';

const detach = await attachConsole();

&nbsp;call detach() if you do not want to print logs to the console anymore

```

