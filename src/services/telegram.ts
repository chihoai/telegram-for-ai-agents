import type { TelegramClient, Message, Dialog, Peer } from '@mtcute/node';
import { tl } from '@mtcute/node';
import qrcodeTerminal from 'qrcode-terminal';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function formatMessagePreview(message: Message | null): string {
  if (!message) return '[no messages yet]';

  const sender = message.sender.displayName;
  const text = collapseWhitespace(message.text);
  if (text) {
    return truncate(`${sender}: ${text}`, 120);
  }

  if (message.isService) return '[service message]';
  if (message.media) return `${sender}: [${message.media.type}]`;

  return `${sender}: [unsupported message]`;
}

export function messageTextForAi(message: Message): string {
  const text = collapseWhitespace(message.text);
  if (text) return text;
  if (message.isService) return '[service message]';
  if (message.media) return `[media:${message.media.type}]`;
  return '[unsupported message]';
}

export interface AiConversationMessage {
  sender: string;
  text: string;
  at: string;
}

export function buildAiConversation(messages: Message[]): AiConversationMessage[] {
  return messages
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((message) => ({
      sender: message.sender.displayName,
      text: messageTextForAi(message),
      at: message.date.toISOString(),
    }));
}

export async function ensureAuthorized(client: TelegramClient): Promise<void> {
  try {
    await client.start({
      qrCodeHandler: (url, expires) => {
        console.log('\nScan this QR code with Telegram:');
        qrcodeTerminal.generate(url, { small: true });
        console.log(`QR expires at ${formatDate(expires)}.\n`);
      },
      password: () => client.input('2FA password (if enabled) > '),
      invalidCodeCallback: async (type) => {
        console.log(`Invalid ${type}. Please try again.`);
      },
    });
    return;
  } catch (error) {
    console.log(
      `QR login failed (${error instanceof Error ? error.message : String(error)}).`,
    );
    console.log('Falling back to phone login...\n');
  }

  const phone = await client.input('Phone number (+123456789) > ');
  await client.start({
    phone,
    code: () => client.input('Login code > '),
    password: () => client.input('2FA password (if enabled) > '),
    invalidCodeCallback: async (type) => {
      console.log(`Invalid ${type}. Please try again.`);
    },
  });
}

export interface ListDialogsOptions {
  limit: number;
  all: boolean;
}

export function normalizePeerRef(value: string | number): string | number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }
  return trimmed;
}

export async function listDialogs(
  client: TelegramClient,
  options: ListDialogsOptions,
): Promise<Dialog[]> {
  const dialogIterator = client.iterDialogs({
    ...(options.all ? {} : { limit: options.limit }),
    pinned: 'include',
    archived: options.all ? 'keep' : 'exclude',
  });

  const dialogs: Dialog[] = [];
  for await (const dialog of dialogIterator) {
    dialogs.push(dialog);
  }
  return dialogs;
}

export function peerToRow(peer: Peer): {
  peerId: number;
  peerKind: 'user' | 'chat';
  username: string | null;
  displayName: string;
} {
  return {
    peerId: peer.id,
    peerKind: peer.type,
    username: peer.username,
    displayName: peer.displayName,
  };
}

export async function fetchChatHistory(
  client: TelegramClient,
  params: { chatId: string | number; limit: number; sinceMessageId?: number },
): Promise<Message[]> {
  const iterator = client.iterHistory(normalizePeerRef(params.chatId), {
    limit: params.limit,
    ...(params.sinceMessageId ? { minId: params.sinceMessageId } : {}),
  });

  const messages: Message[] = [];
  for await (const message of iterator) {
    messages.push(message);
  }
  return messages;
}

export async function searchTelegramMessages(
  client: TelegramClient,
  params: { query: string; limit: number; chatId?: string | number },
): Promise<Message[]> {
  const iterator = params.chatId
    ? client.iterSearchMessages({
        chatId: normalizePeerRef(params.chatId),
        query: params.query,
        limit: params.limit,
      })
    : client.iterSearchGlobal({
        query: params.query,
        limit: params.limit,
      });

  const messages: Message[] = [];
  for await (const message of iterator) {
    messages.push(message);
  }
  return messages;
}

export function toTextWithEntities(text: string): tl.RawTextWithEntities {
  return {
    _: 'textWithEntities',
    text,
    entities: [],
  };
}

function inputPeerKey(peer: tl.TypeInputPeer): string {
  return JSON.stringify(peer);
}

export function uniqueInputPeers(peers: tl.TypeInputPeer[]): tl.TypeInputPeer[] {
  const seen = new Set<string>();
  const result: tl.TypeInputPeer[] = [];
  for (const peer of peers) {
    const key = inputPeerKey(peer);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(peer);
  }
  return result;
}

export function folderTitle(folder: tl.RawDialogFilter): string {
  return folder.title.text;
}

export async function listEditableFolders(client: TelegramClient): Promise<tl.RawDialogFilter[]> {
  const folders = await client.getFolders();
  return folders.filters.filter((filter): filter is tl.RawDialogFilter => filter._ === 'dialogFilter');
}

export async function resolveFolderByRef(
  client: TelegramClient,
  folderRef: string,
): Promise<tl.RawDialogFilter> {
  const folders = await listEditableFolders(client);
  const asId = Number.parseInt(folderRef, 10);
  const folder = Number.isInteger(asId)
    ? folders.find((item) => item.id === asId)
    : folders.find((item) => folderTitle(item).toLowerCase() === folderRef.toLowerCase());

  if (!folder) {
    throw new Error(`Folder not found: ${folderRef}`);
  }
  return folder;
}
