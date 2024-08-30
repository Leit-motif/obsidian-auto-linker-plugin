
# Linkify Plugin for Obsidian

AutoLinker is an Obsidian plugin designed to automatically link specified words in your Markdown files to existing notes in your vault. This plugin is customizable, allowing you to define which words to link, exclude specific blocks or strings, and manage links across directories.

## Features

- **Auto-Linking**: Automatically links specified words in your Markdown files to notes in your vault.
- **Customizable Settings**: Allows you to set up whitelisted/blacklisted strings, exclude certain blocks, and limit linking to existing files only.
- **Directory Management**: Extend linking to all files in a specified directory or remove links from a directory.
- **Undo Last Changes**: Provides the ability to undo the most recent set of auto-linking changes.

## Installation

### Manual Installation

1. Download the latest release of the plugin from the [GitHub Releases page](#).
2. Extract the downloaded folder and place it in your Obsidian vault under `/.obsidian/plugins/auto-linker`.
3. Enable the plugin in Obsidian by navigating to `Settings` > `Community Plugins`, and toggling on "Auto Linker."

### Obsidian Plugin Marketplace (Recommended)

1. Open Obsidian and navigate to `Settings` > `Community Plugins`.
2. Click on `Browse` and search for "Auto Linker."
3. Click `Install` and then `Enable`.

## Usage

### Auto-Linking the Current File

To auto-link words in the currently active Markdown file:

1. Open a Markdown file in Obsidian.
2. Click the Auto Linker icon in the ribbon or use the command palette (`Ctrl + P` or `Cmd + P`), and search for "Auto-link current file."

### Extending Linking to a Directory

You can extend the auto-linking functionality to all Markdown files in a specified directory:

1. Go to `Settings` > `Auto Linker`.
2. Under "Manage Links By Folder," choose a directory.
3. Click "Add Links" to auto-link words in all files within the chosen directory.

### Removing Links from a Directory

If you need to remove specific links from files in a directory:

1. Go to `Settings` > `Auto Linker`.
2. Under "Remove Links," enter the links you wish to remove, separated by commas.
3. Click "Remove Links" to clean up the specified links from the chosen directory.

### Undoing Last Changes

If you need to revert the last set of changes made by Auto Linker:

1. Go to `Settings` > `Auto Linker`.
2. Click "Undo Last Changes" to restore the previous state of the modified files.

## Settings

### Link Existing Files Only

- **Description**: Only create links for files that already exist in the vault.
- **Default**: `false`

### Excluded Blocks

- **Description**: Enter block names to exclude from linking, separated by commas (e.g., Dailies, Tasks, Notes).
- **Default**: `""`

### Blacklisted Strings

- **Description**: Enter strings that should never be linked, separated by commas (e.g., and, or, the).
- **Default**: `""`

### Whitelisted Strings

- **Description**: Enter strings to be exclusively linked, separated by commas. If empty, all non-blacklisted strings will be linked.
- **Default**: `""`

### Manage Links By Folder

- **Description**: Choose a directory to manage links.
- **Default**: `""`

### Remove Links

- **Description**: Enter links to remove, separated by commas (e.g., link1, link2, link3).
- **Default**: `""`

### Undo Last Changes

- **Description**: Undo the last set of changes made by Auto Linker.
- **Default**: `false`

## License

This plugin is licensed under the MIT License. See the [LICENSE](#) file for more details.
