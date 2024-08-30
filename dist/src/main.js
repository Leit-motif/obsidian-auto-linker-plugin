"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class AutoLinkerPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS; // Initialize with default settings
        this.lastChanges = [];
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            // Replace ribbon icon functionality
            this.addRibbonIcon('link', 'Auto Link Current File', () => {
                this.autoLinkCurrentFile();
            });
            // Modify the command to use the new method
            this.addCommand({
                id: 'auto-link-current-file',
                name: 'Auto-link current file',
                editorCallback: (editor, ctx) => {
                    if (ctx instanceof obsidian_1.MarkdownView) {
                        this.autoLinkCurrentFile();
                    }
                }
            });
            // Add settings tab
            this.addSettingTab(new AutoLinkerSettingTab(this.app, this));
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    // New method to handle current file linking
    autoLinkCurrentFile() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastChanges = []; // Clear previous changes before new operation
            console.log('Attempting to auto-link current file');
            const activeView = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
            if (activeView && activeView.file) {
                console.log('Active file found:', activeView.file.path);
                yield this.autoLinkFile(activeView.file);
                new obsidian_1.Notice('Auto-linking completed for the current file');
            }
            else {
                console.log('No active Markdown file found');
                new obsidian_1.Notice('No active Markdown file');
            }
        });
    }
    autoLinkFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Reading file:', file.path);
            const content = yield this.app.vault.read(file);
            console.log('File content length:', content.length);
            console.log('First 100 characters:', content.substring(0, 100));
            const wordsToLink = yield this.getWordsToLink();
            const linkedContent = this.linkWords(content, wordsToLink);
            console.log('Linked content length:', linkedContent.length);
            console.log('First 100 characters after linking:', linkedContent.substring(0, 100));
            if (content !== linkedContent) {
                console.log('Changes detected, modifying file');
                this.lastChanges.push({ file, oldContent: content });
                yield this.app.vault.modify(file, linkedContent);
            }
            else {
                console.log('No changes made to the file');
                new obsidian_1.Notice('No changes made to the file');
            }
        });
    }
    linkWords(content, wordsToLink) {
        console.log('Linking words in content');
        console.log('Words to link:', wordsToLink);
        const excludedBlocks = this.settings.excludedBlocks.split(',').map(block => block.trim().toLowerCase());
        const blacklistedStrings = this.settings.blacklistedStrings.split(',').map(str => str.trim().toLowerCase());
        const whitelistedStrings = this.settings.whitelistedStrings.split(',').map(str => str.trim().toLowerCase());
        let sections = content.split(/^(#.*$)/m);
        let totalReplacements = 0;
        let isExcludedBlock = false;
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].startsWith('#')) {
                isExcludedBlock = excludedBlocks.some(block => sections[i].toLowerCase().includes(block));
            }
            else if (!isExcludedBlock) {
                for (const word of wordsToLink) {
                    const lowercaseWord = word.toLowerCase();
                    if (!blacklistedStrings.includes(lowercaseWord) &&
                        (whitelistedStrings.length === 0 || whitelistedStrings[0] === '' || whitelistedStrings.includes(lowercaseWord))) {
                        const pattern = new RegExp(`(?<!\\[\\[)\\b(${this.escapeRegExp(word)})\\b(?!\\]\\])`, 'gi');
                        sections[i] = sections[i].replace(pattern, (match, p1) => {
                            if (this.settings.existingFilesOnly && !this.fileExists(word)) {
                                return match; // Don't link if file doesn't exist and setting is on
                            }
                            totalReplacements++;
                            console.log(`Linked word "${match}" in section`);
                            return `[[${match}]]`; // Use the original case from the document
                        });
                    }
                }
            }
        }
        console.log(`Total replacements made: ${totalReplacements}`);
        return sections.join('');
    }
    getWordsToLink() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Getting words to link');
            let words = [];
            // Get words from vault links
            const vaultLinks = yield this.getVaultLinks();
            words = [...new Set(vaultLinks)]; // Remove duplicates
            console.log(`Found ${words.length} words from vault links`);
            // Apply whitelist if specified
            const whitelist = this.settings.whitelistedStrings.split(',').map(str => str.trim());
            if (whitelist.length > 0 && whitelist[0] !== '') {
                words = words.filter(word => whitelist.some(w => w.toLowerCase() === word.toLowerCase()));
                console.log(`After applying whitelist: ${words.length} words`);
            }
            console.log(`Total words to link: ${words.length}`);
            return words;
        });
    }
    getVaultLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            const links = new Set();
            const rootFolder = this.app.vault.getRoot();
            yield this.processFolder(rootFolder, links);
            return Array.from(links);
        });
    }
    fileExists(link) {
        // Remove file extension if present
        const linkWithoutExtension = link.replace(/\.md$/, '');
        // Check if the file exists in the vault
        return this.app.vault.getAbstractFileByPath(`${linkWithoutExtension}.md`) instanceof obsidian_1.TFile;
    }
    processFolder(folder, links) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const child of folder.children) {
                if (child instanceof obsidian_1.TFile && child.extension === 'md') {
                    const fileLinks = yield this.getFileLinks(child);
                    fileLinks.forEach(link => links.add(link));
                }
                else if (child instanceof obsidian_1.TFolder) {
                    // Recursively process subfolders
                    yield this.processFolder(child, links);
                }
            }
        });
    }
    getFileLinks(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.app.vault.read(file);
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            const links = [];
            let match;
            while ((match = linkRegex.exec(content)) !== null) {
                const link = match[1].split('|')[0].trim();
                if (!link.includes('.') || link.endsWith('.md')) {
                    links.push(link);
                }
            }
            return links;
        });
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    extendLinkingToDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            const directory = this.app.vault.getAbstractFileByPath(this.settings.specifiedDirectory);
            if (!(directory instanceof obsidian_1.TFolder)) {
                new obsidian_1.Notice('Invalid directory specified');
                return;
            }
            const files = yield this.getMarkdownFiles(directory);
            for (const file of files) {
                yield this.autoLinkFile(file);
            }
            new obsidian_1.Notice(`Linking extended to ${files.length} files in ${this.settings.specifiedDirectory}`);
        });
    }
    getMarkdownFiles(folder) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = [];
            for (const child of folder.children) {
                if (child instanceof obsidian_1.TFile && child.extension === 'md') {
                    files.push(child);
                }
                else if (child instanceof obsidian_1.TFolder) {
                    files.push(...yield this.getMarkdownFiles(child));
                }
            }
            return files;
        });
    }
    removeLinksFromDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            const directory = this.app.vault.getAbstractFileByPath(this.settings.specifiedDirectory);
            if (!(directory instanceof obsidian_1.TFolder)) {
                new obsidian_1.Notice('Invalid directory specified');
                return;
            }
            const files = yield this.getMarkdownFiles(directory);
            const linksToRemove = this.settings.linksToRemove.split(',').map(link => link.trim());
            let totalRemoved = 0;
            for (const file of files) {
                const content = yield this.app.vault.read(file);
                const newContent = this.removeLinks(content, linksToRemove);
                if (content !== newContent) {
                    yield this.app.vault.modify(file, newContent);
                    totalRemoved++;
                }
            }
            new obsidian_1.Notice(`Removed links from ${totalRemoved} files in ${this.settings.specifiedDirectory}`);
        });
    }
    removeLinks(content, linksToRemove) {
        let newContent = content;
        for (const link of linksToRemove) {
            const pattern = new RegExp(`\\[\\[${this.escapeRegExp(link)}\\]\\]`, 'gi');
            newContent = newContent.replace(pattern, link);
        }
        return newContent;
    }
    undoLastChanges() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastChanges.length === 0) {
                new obsidian_1.Notice('No changes to undo');
                return;
            }
            for (const change of this.lastChanges) {
                yield this.app.vault.modify(change.file, change.oldContent);
            }
            new obsidian_1.Notice(`Undid changes in ${this.lastChanges.length} file(s)`);
            this.lastChanges = []; // Clear the changes after undoing
        });
    }
}
exports.default = AutoLinkerPlugin;
const DEFAULT_SETTINGS = {
    existingFilesOnly: false,
    specifiedDirectory: '',
    excludedBlocks: '',
    blacklistedStrings: '',
    whitelistedStrings: '',
    linksToRemove: ''
};
class AutoLinkerSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Auto Linker Settings' });
        new obsidian_1.Setting(containerEl)
            .setName('Link Existing Files Only')
            .setDesc('Only create links for files that already exist in the vault')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.existingFilesOnly)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.existingFilesOnly = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Excluded Blocks')
            .setDesc('Enter block names to exclude from linking, separated by commas (e.g., Dailies, Tasks, Notes)')
            .addText(text => text
            .setPlaceholder('Dailies, Tasks, Notes')
            .setValue(this.plugin.settings.excludedBlocks)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.excludedBlocks = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Blacklisted Strings')
            .setDesc('Enter strings to never be linked, separated by commas (e.g., and, or, the)')
            .addText(text => text
            .setPlaceholder('and, or, the')
            .setValue(this.plugin.settings.blacklistedStrings)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.blacklistedStrings = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Whitelisted Strings')
            .setDesc('Enter strings to be exclusively linked, separated by commas. If empty, all non-blacklisted strings will be linked.')
            .addText(text => text
            .setPlaceholder('important, keyword, topic')
            .setValue(this.plugin.settings.whitelistedStrings)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.whitelistedStrings = value;
            yield this.plugin.saveSettings();
        })));
        this.manageLinksSetting = new obsidian_1.Setting(containerEl)
            .setName('Manage Links By Folder')
            .setDesc('Choose a directory to manage links')
            .addText(text => text
            .setPlaceholder('Example: folder/subfolder')
            .setValue(this.plugin.settings.specifiedDirectory)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.specifiedDirectory = value;
            yield this.plugin.saveSettings();
            this.updateManageLinksButtons();
        })))
            .addButton(button => button
            .setButtonText('Choose Directory')
            .onClick(() => {
            new FolderSuggestModal(this.app, (folder) => {
                this.plugin.settings.specifiedDirectory = folder.path;
                this.plugin.saveSettings();
                this.display();
            }).open();
        }));
        this.addLinksSetting = new obsidian_1.Setting(containerEl)
            .setName('Add Links')
            .setDesc('Extend linking functionality to the chosen directory')
            .addButton(button => button
            .setButtonText('Add Links')
            .onClick(() => {
            new ConfirmationModal(this.app, 'Are you sure you wish to add links to the chosen directory?', () => __awaiter(this, void 0, void 0, function* () {
                yield this.plugin.extendLinkingToDirectory();
                this.clearSpecifiedDirectory();
            })).open();
        }));
        this.removeLinksSetting = new obsidian_1.Setting(containerEl)
            .setName('Remove Links')
            .setDesc('Remove specified links from the chosen directory')
            .addText(text => text
            .setPlaceholder('link1, link2, link3')
            .setValue(this.plugin.settings.linksToRemove)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.linksToRemove = value;
            yield this.plugin.saveSettings();
        })))
            .addButton(button => button
            .setButtonText('Remove Links')
            .onClick(() => {
            new ConfirmationModal(this.app, 'Are you sure you want to remove these links from the chosen directory?', () => __awaiter(this, void 0, void 0, function* () {
                yield this.plugin.removeLinksFromDirectory();
                this.clearLinksToRemove();
            })).open();
        }));
        new obsidian_1.Setting(containerEl)
            .setName('Undo Last Changes')
            .setDesc('Undo the last set of changes made by the Auto Linker')
            .addButton(button => button
            .setButtonText('Undo Last Changes')
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.undoLastChanges();
            this.display(); // Refresh the settings view
        })));
        this.updateManageLinksButtons();
    }
    updateManageLinksButtons() {
        const isDirectorySpecified = !!this.plugin.settings.specifiedDirectory;
        this.addLinksSetting.settingEl.style.display = isDirectorySpecified ? 'flex' : 'none';
        this.removeLinksSetting.settingEl.style.display = isDirectorySpecified ? 'flex' : 'none';
        this.addLinksSetting.components[0].setDisabled(!isDirectorySpecified);
        this.removeLinksSetting.components[1].setDisabled(!isDirectorySpecified);
    }
    clearSpecifiedDirectory() {
        this.plugin.settings.specifiedDirectory = '';
        this.plugin.saveSettings();
        this.manageLinksSetting.components[0].setValue('');
        this.updateManageLinksButtons();
    }
    clearLinksToRemove() {
        this.plugin.settings.linksToRemove = '';
        this.plugin.saveSettings();
        this.removeLinksSetting.components[0].setValue('');
    }
}
class FolderSuggestModal extends obsidian_1.Modal {
    constructor(app, onChoose) {
        super(app);
        this.result = onChoose;
        this.input = null; // Initialize here, will be properly set in onOpen
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Choose a folder" });
        this.input = contentEl.createEl("input", {
            type: "text",
            value: ""
        });
        const folderList = contentEl.createEl("ul");
        const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof obsidian_1.TFolder);
        folders.forEach(folder => {
            const item = folderList.createEl("li");
            item.setText(folder.path);
            item.onClickEvent(() => {
                this.result(folder);
                this.close();
            });
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class ConfirmationModal extends obsidian_1.Modal {
    constructor(app, message, onConfirm) {
        super(app);
        this.message = message;
        this.result = onConfirm;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("p", { text: this.message });
        new obsidian_1.Setting(contentEl)
            .addButton(button => button
            .setButtonText('Confirm')
            .onClick(() => {
            this.result();
            this.close();
        }))
            .addButton(button => button
            .setButtonText('Cancel')
            .onClick(() => this.close()));
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
