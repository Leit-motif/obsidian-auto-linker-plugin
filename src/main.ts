import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownFileInfo, TFolder, TextComponent } from 'obsidian';

interface AutoLinkerSettings {
    existingFilesOnly: boolean;
    specifiedDirectory: string;
    excludedBlocks: string;
    blacklistedStrings: string;
    whitelistedStrings: string;
    linksToRemove: string;
}

export default class AutoLinkerPlugin extends Plugin {
    settings: AutoLinkerSettings = DEFAULT_SETTINGS; // Initialize with default settings

    async onload() {
        await this.loadSettings();

        // Replace ribbon icon functionality
        this.addRibbonIcon('link', 'Auto Link Current File', () => {
            this.autoLinkCurrentFile();
        });

        // Modify the command to use the new method
        this.addCommand({
            id: 'auto-link-current-file',
            name: 'Auto-link current file',
            editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
                if (ctx instanceof MarkdownView) {
                    this.autoLinkCurrentFile();
                }
            }
        });

        // Add settings tab
        this.addSettingTab(new AutoLinkerSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // New method to handle current file linking
    async autoLinkCurrentFile() {
        console.log('Attempting to auto-link current file');
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file) {
            console.log('Active file found:', activeView.file.path);
            await this.autoLinkFile(activeView.file);
            new Notice('Auto-linking completed for the current file');
        } else {
            console.log('No active Markdown file found');
            new Notice('No active Markdown file');
        }
    }

    async autoLinkFile(file: TFile) {
        console.log('Reading file:', file.path);
        const content = await this.app.vault.read(file);
        console.log('File content length:', content.length);
        console.log('First 100 characters:', content.substring(0, 100));
        const wordsToLink = await this.getWordsToLink();
        const linkedContent = this.linkWords(content, wordsToLink);
        console.log('Linked content length:', linkedContent.length);
        console.log('First 100 characters after linking:', linkedContent.substring(0, 100));
        if (content !== linkedContent) {
            console.log('Changes detected, modifying file');
            await this.app.vault.modify(file, linkedContent);
        } else {
            console.log('No changes made to the file');
            new Notice('No changes made to the file');
        }
    }

    linkWords(content: string, wordsToLink: string[]): string {
        console.log('Linking words in content');
        console.log('Words to link:', wordsToLink);
        
        const excludedBlocks = this.settings.excludedBlocks.split(',').map(block => block.trim());
        const blacklistedStrings = this.settings.blacklistedStrings.split(',').map(str => str.trim().toLowerCase());
        const whitelistedStrings = this.settings.whitelistedStrings.split(',').map(str => str.trim().toLowerCase());
        let sections = content.split(/^(#.*$)/m);
        let totalReplacements = 0;
        let isExcludedBlock = false;

        for (let i = 0; i < sections.length; i++) {
            if (sections[i].startsWith('#')) {
                isExcludedBlock = excludedBlocks.some(block => sections[i].toLowerCase().includes(block.toLowerCase()));
            } else if (!isExcludedBlock) {
                for (const word of wordsToLink) {
                    if (!blacklistedStrings.includes(word.toLowerCase()) &&
                        (whitelistedStrings.length === 0 || whitelistedStrings[0] === '' || whitelistedStrings.includes(word.toLowerCase()))) {
                        const pattern = new RegExp(`(?<!\\[\\[)\\b${this.escapeRegExp(word)}\\b(?!\\]\\])`, 'gi');
                        const originalSection = sections[i];
                        sections[i] = sections[i].replace(pattern, (match) => {
                            if (this.settings.existingFilesOnly && !this.fileExists(match)) {
                                return match; // Don't link if file doesn't exist and setting is on
                            }
                            totalReplacements++;
                            console.log(`Linked word "${match}" in section`);
                            return `[[${match}]]`;
                        });
                    }
                }
            }
        }

        console.log(`Total replacements made: ${totalReplacements}`);
        return sections.join('');
    }

    async getWordsToLink(): Promise<string[]> {
        console.log('Getting words to link');
        let words: string[] = [];

        // Get words from vault links
        const vaultLinks = await this.getVaultLinks();
        words = [...vaultLinks];
        console.log(`Found ${words.length} words from vault links`);

        // Apply whitelist if specified
        const whitelist = this.settings.whitelistedStrings.split(',').map(str => str.trim());
        if (whitelist.length > 0 && whitelist[0] !== '') {
            words = words.filter(word => whitelist.includes(word));
            console.log(`After applying whitelist: ${words.length} words`);
        }

        console.log(`Total words to link: ${words.length}`);
        return words;
    }

    async getVaultLinks(): Promise<string[]> {
        const links = new Set<string>();
        const rootFolder = this.app.vault.getRoot();
        await this.processFolder(rootFolder, links);
        
        if (this.settings.existingFilesOnly) {
            return Array.from(links).filter(link => this.fileExists(link));
        }
        
        return Array.from(links);
    }

    private fileExists(link: string): boolean {
        // Remove file extension if present
        const linkWithoutExtension = link.replace(/\.md$/, '');
        // Check if the file exists in the vault
        return this.app.vault.getAbstractFileByPath(`${linkWithoutExtension}.md`) instanceof TFile;
    }

    async processFolder(folder: TFolder, links: Set<string>): Promise<void> {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                if (folder.path === '/') {  // Only process files in the root
                    const fileLinks = await this.getFileLinks(child);
                    fileLinks.forEach(link => links.add(link));
                }
            } else if (child instanceof TFolder) {
                // Recursively process subfolders if needed
                // await this.processFolder(child, links);
            }
        }
    }

    async getFileLinks(file: TFile): Promise<string[]> {
        const content = await this.app.vault.read(file);
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        const links: string[] = [];
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            const link = match[1].split('|')[0].trim();
            if (!link.includes('.') || link.endsWith('.md')) {
                links.push(link);
            }
        }
        return links;
    }

    escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async extendLinkingToDirectory() {
        const directory = this.app.vault.getAbstractFileByPath(this.settings.specifiedDirectory);
        if (!(directory instanceof TFolder)) {
            new Notice('Invalid directory specified');
            return;
        }

        const files = await this.getMarkdownFiles(directory);
        for (const file of files) {
            await this.autoLinkFile(file);
        }
        new Notice(`Linking extended to ${files.length} files in ${this.settings.specifiedDirectory}`);
    }

    async getMarkdownFiles(folder: TFolder): Promise<TFile[]> {
        const files: TFile[] = [];
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder) {
                files.push(...await this.getMarkdownFiles(child));
            }
        }
        return files;
    }

    async removeLinksFromDirectory() {
        const directory = this.app.vault.getAbstractFileByPath(this.settings.specifiedDirectory);
        if (!(directory instanceof TFolder)) {
            new Notice('Invalid directory specified');
            return;
        }

        const files = await this.getMarkdownFiles(directory);
        const linksToRemove = this.settings.linksToRemove.split(',').map(link => link.trim());
        let totalRemoved = 0;

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const newContent = this.removeLinks(content, linksToRemove);
            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
                totalRemoved++;
            }
        }

        new Notice(`Removed links from ${totalRemoved} files in ${this.settings.specifiedDirectory}`);
    }

    removeLinks(content: string, linksToRemove: string[]): string {
        let newContent = content;
        for (const link of linksToRemove) {
            const pattern = new RegExp(`\\[\\[${this.escapeRegExp(link)}\\]\\]`, 'gi');
            newContent = newContent.replace(pattern, link);
        }
        return newContent;
    }
}

const DEFAULT_SETTINGS: AutoLinkerSettings = {
    existingFilesOnly: false,
    specifiedDirectory: '',
    excludedBlocks: '',
    blacklistedStrings: '',
    whitelistedStrings: '',
    linksToRemove: ''
}

class AutoLinkerSettingTab extends PluginSettingTab {
    plugin: AutoLinkerPlugin;
    manageLinksSetting!: Setting;
    addLinksSetting!: Setting;
    removeLinksSetting!: Setting;

    constructor(app: App, plugin: AutoLinkerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Auto Linker Settings'});

        new Setting(containerEl)
            .setName('Link Existing Files Only')
            .setDesc('Only create links for files that already exist in the vault')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.existingFilesOnly)
                .onChange(async (value) => {
                    this.plugin.settings.existingFilesOnly = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Excluded Blocks')
            .setDesc('Enter block names to exclude from linking, separated by commas (e.g., Dailies, Tasks, Notes)')
            .addText(text => text
                .setPlaceholder('Dailies, Tasks, Notes')
                .setValue(this.plugin.settings.excludedBlocks)
                .onChange(async (value) => {
                    this.plugin.settings.excludedBlocks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Blacklisted Strings')
            .setDesc('Enter strings to never be linked, separated by commas (e.g., and, or, the)')
            .addText(text => text
                .setPlaceholder('and, or, the')
                .setValue(this.plugin.settings.blacklistedStrings)
                .onChange(async (value) => {
                    this.plugin.settings.blacklistedStrings = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Whitelisted Strings')
            .setDesc('Enter strings to be exclusively linked, separated by commas. If empty, all non-blacklisted strings will be linked.')
            .addText(text => text
                .setPlaceholder('important, keyword, topic')
                .setValue(this.plugin.settings.whitelistedStrings)
                .onChange(async (value) => {
                    this.plugin.settings.whitelistedStrings = value;
                    await this.plugin.saveSettings();
                }));

        this.manageLinksSetting = new Setting(containerEl)
            .setName('Manage Links By Folder')
            .setDesc('Choose a directory to manage links')
            .addText(text => text
                .setPlaceholder('Example: folder/subfolder')
                .setValue(this.plugin.settings.specifiedDirectory)
                .onChange(async (value) => {
                    this.plugin.settings.specifiedDirectory = value;
                    await this.plugin.saveSettings();
                    this.updateManageLinksButtons();
                }))
            .addButton(button => button
                .setButtonText('Choose Directory')
                .onClick(() => {
                    new FolderSuggestModal(this.app, (folder) => {
                        this.plugin.settings.specifiedDirectory = folder.path;
                        this.plugin.saveSettings();
                        this.display();
                    }).open();
                }));

        this.addLinksSetting = new Setting(containerEl)
            .setName('Add Links')
            .setDesc('Extend linking functionality to the chosen directory')
            .addButton(button => button
                .setButtonText('Add Links')
                .onClick(() => {
                    new ConfirmationModal(this.app, 'Are you sure you wish to add links to the chosen directory?', async () => {
                        await this.plugin.extendLinkingToDirectory();
                        this.clearSpecifiedDirectory();
                    }).open();
                }));

        this.removeLinksSetting = new Setting(containerEl)
            .setName('Remove Links')
            .setDesc('Remove specified links from the chosen directory')
            .addText(text => text
                .setPlaceholder('link1, link2, link3')
                .setValue(this.plugin.settings.linksToRemove)
                .onChange(async (value) => {
                    this.plugin.settings.linksToRemove = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setButtonText('Remove Links')
                .onClick(() => {
                    new ConfirmationModal(this.app, 'Are you sure you want to remove these links from the chosen directory?', async () => {
                        await this.plugin.removeLinksFromDirectory();
                        this.clearLinksToRemove();
                    }).open();
                }));

        this.updateManageLinksButtons();
    }

    updateManageLinksButtons(): void {
        const isDirectorySpecified = !!this.plugin.settings.specifiedDirectory;
        this.addLinksSetting.settingEl.style.display = isDirectorySpecified ? 'flex' : 'none';
        this.removeLinksSetting.settingEl.style.display = isDirectorySpecified ? 'flex' : 'none';
        this.addLinksSetting.components[0].setDisabled(!isDirectorySpecified);
        this.removeLinksSetting.components[1].setDisabled(!isDirectorySpecified);
    }

    clearSpecifiedDirectory(): void {
        this.plugin.settings.specifiedDirectory = '';
        this.plugin.saveSettings();
        (this.manageLinksSetting.components[0] as TextComponent).setValue('');
        this.updateManageLinksButtons();
    }

    clearLinksToRemove(): void {
        this.plugin.settings.linksToRemove = '';
        this.plugin.saveSettings();
        (this.removeLinksSetting.components[0] as TextComponent).setValue('');
    }
}

class FolderSuggestModal extends Modal {
    private result: (folder: TFolder) => void;
    private input: HTMLInputElement;

    constructor(app: App, onChoose: (folder: TFolder) => void) {
        super(app);
        this.result = onChoose;
        this.input = null as any; // Initialize here, will be properly set in onOpen
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Choose a folder" });

        this.input = contentEl.createEl("input", {
            type: "text",
            value: ""
        });

        const folderList = contentEl.createEl("ul");
        const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder) as TFolder[];

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

class ConfirmationModal extends Modal {
    private result: () => void;
    private message: string;

    constructor(app: App, message: string, onConfirm: () => void) {
        super(app);
        this.message = message;
        this.result = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("p", { text: this.message });
        
        new Setting(contentEl)
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
