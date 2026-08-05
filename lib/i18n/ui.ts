/**
 * Interface copy. PRD §9: Indonesian first for explanation, English secondary,
 * and git's own vocabulary — commit, rebase, HEAD, detached, reflog — left in
 * English in both, so the words transfer to real git and real documentation.
 *
 * Engine messages carry their own pair (see lib/i18n/localized); this file is
 * only the chrome around them.
 */
import type { Locale } from './locales'

export interface UiCopy {
  readonly tagline: string
  readonly enter: string
  readonly scenarios: string
  readonly compare: string
  readonly prior: string
  readonly honest: string

  readonly objects: string
  readonly orphans: string
  readonly detached: string
  readonly clear: string
  readonly share: string
  readonly shared: string

  readonly commandBar: string
  readonly commandsSupported: string
  readonly commandHint: string

  readonly worktree: string
  readonly notAGitCommand: string
  readonly newFile: string
  readonly noFiles: string
  readonly savesOnBlur: string
  readonly conflictHelp: string

  readonly register: string
  readonly boxesWithoutCards: string
  readonly orphanHelp: string
  readonly recover: string
  readonly noMovements: string

  readonly remotePanel: string
  readonly push: string
  readonly fetch: string
  readonly remoteEmpty: string
  readonly notFetched: string
  readonly freshClone: string
  readonly notOnRemote: string
  readonly notOnRemoteHelp: string

  readonly interactiveRebase: string
  readonly buildTodo: string
  readonly todoIntro: string
  readonly run: string
  readonly willBeRewritten: string
  readonly newMessage: string
  readonly upstream: string

  readonly diffTitle: string
  readonly diffHint: string

  readonly scenarioLabel: string
  readonly thenTry: string
  readonly emptyShelf: string
}

const EN: UiCopy = {
  tagline:
    'Rebase does not move commits. It creates new ones — with new hashes — and leaves the originals on the shelf.',
  enter: 'Open the repository',
  scenarios: 'Scenarios',
  compare: 'Compare',
  prior:
    'Learn Git Branching is the better and more complete tutorial. This is not a tutorial; it is a sandbox.',
  honest:
    'Hashes here are real in the sense of being content-derived and internally consistent — not identical to what git would produce on your machine, because git also folds in the committer time and the author identity. Cangkok uses a virtual clock so every session replays exactly.',

  objects: 'objects',
  orphans: 'orphaned',
  detached: 'HEAD detached',
  clear: 'Clear',
  share: 'Share URL',
  shared: 'Copied',

  commandBar: 'Command bar',
  commandsSupported: 'commands supported',
  commandHint: 'Try:',

  worktree: 'Working tree',
  notAGitCommand: 'not a git command',
  newFile: '+ new file',
  noFiles: 'No files yet.',
  savesOnBlur: 'Saved when the cursor leaves the box. Nothing becomes an object until',
  conflictHelp: 'Conflict. Remove the markers, keep the content you want, then',

  register: 'Reflog — the register',
  boxesWithoutCards: 'Boxes with no card',
  orphanHelp:
    'Still on the shelf, pointed at by no ref. Not gone — gc sweeps them, and only after the reflog is dropped.',
  recover: 'Rescue',
  noMovements: '(no ref movements yet)',

  remotePanel: 'the peer',
  push: 'Push',
  fetch: 'Fetch',
  remoteEmpty:
    'Nothing there yet. push sends your branch across without creating any object — only the card moves.',
  notFetched: 'not fetched',
  freshClone: 'A fresh clone would contain',
  notOnRemote: 'Not on',
  notOnRemoteHelp:
    'Still in your store, but not reachable from any ref over there. If this appeared after push --force, this is what is missing for anyone cloning today — and what a colleague who already fetched still holds.',

  interactiveRebase: 'Interactive rebase',
  buildTodo: 'Build todo',
  todoIntro:
    'Lists upstream..HEAD, oldest first — the same order git rebase -i opens. The result runs as one replayable, shareable command line.',
  run: 'Run',
  willBeRewritten: 'commit(s) will be written as new objects.',
  newMessage: 'new message (blank = keep the old one)',
  upstream: 'Upstream',

  diffTitle: 'Diff',
  diffHint: 'Compare two commits, or a commit against the working tree.',

  scenarioLabel: 'Scenario',
  thenTry: 'Then try',
  emptyShelf: 'The shelf is empty. Write a file, then',
}

const ID: UiCopy = {
  tagline:
    'Rebase tidak memindahkan commit. Ia membuat commit baru — dengan hash baru — dan meninggalkan yang asli di rak.',
  enter: 'Buka repositori',
  scenarios: 'Skenario',
  compare: 'Banding',
  prior:
    'Learn Git Branching adalah tutorial yang lebih baik dan lebih lengkap. Ini bukan tutorial; ini sandbox.',
  honest:
    'Hash di sini nyata dalam arti diturunkan dari isi objek dan konsisten secara internal — bukan identik dengan yang dihasilkan git di mesin Anda, karena git ikut memasukkan waktu committer dan identitas penulis. Cangkok memakai jam virtual supaya setiap sesi bisa diulang persis.',

  objects: 'objek',
  orphans: 'yatim',
  detached: 'HEAD detached',
  clear: 'Kosongkan',
  share: 'Bagikan URL',
  shared: 'Tersalin',

  commandBar: 'Command bar',
  commandsSupported: 'perintah didukung',
  commandHint: 'Coba:',

  worktree: 'Working tree',
  notAGitCommand: 'bukan perintah git',
  newFile: '+ file baru',
  noFiles: 'Belum ada file.',
  savesOnBlur: 'Tersimpan saat kursor meninggalkan kotak. Belum jadi objek sampai',
  conflictHelp: 'Konflik. Hapus penandanya, simpan isi yang benar, lalu',

  register: 'Reflog — register',
  boxesWithoutCards: 'Kotak tanpa kartu',
  orphanHelp:
    'Masih di rak, tidak ditunjuk ref mana pun. Belum hilang — gc yang menyapunya, dan hanya setelah reflog dibuang.',
  recover: 'Selamatkan',
  noMovements: '(belum ada pergerakan ref)',

  remotePanel: 'sisi rekan',
  push: 'Push',
  fetch: 'Fetch',
  remoteEmpty:
    'Belum ada apa-apa. push mengirim branch Anda ke sana tanpa membuat objek baru — yang berpindah hanya kartunya.',
  notFetched: 'belum di-fetch',
  freshClone: 'Clone baru akan berisi',
  notOnRemote: 'Tidak ada di',
  notOnRemoteHelp:
    'Masih ada di store Anda, tapi tidak terjangkau dari ref mana pun di sana. Kalau ini muncul sesudah push --force, inilah yang hilang bagi orang yang clone hari ini — dan yang masih dipegang rekan yang sudah terlanjur fetch.',

  interactiveRebase: 'Rebase interaktif',
  buildTodo: 'Susun todo',
  todoIntro:
    'Menyusun daftar upstream..HEAD, urut dari yang paling tua — persis urutan yang dibuka git rebase -i. Hasilnya dijalankan sebagai satu baris perintah yang bisa diputar ulang dan dibagikan.',
  run: 'Jalankan',
  willBeRewritten: 'commit akan ditulis sebagai objek baru.',
  newMessage: 'pesan baru (kosong = pakai yang lama)',
  upstream: 'Upstream',

  diffTitle: 'Diff',
  diffHint: 'Bandingkan dua commit, atau sebuah commit dengan working tree.',

  scenarioLabel: 'Skenario',
  thenTry: 'Lalu coba',
  emptyShelf: 'Rak masih kosong. Tulis sebuah file, lalu',
}

export const UI: Record<Locale, UiCopy> = { en: EN, id: ID }

/** The todo actions, explained. git-rebase(1), "Interactive Mode". */
export const TODO_HELP: Record<Locale, Record<string, string>> = {
  en: {
    pick: 'replay it as it is',
    reword: 'replay it, change the message',
    squash: 'fold into the commit above, messages combined',
    fixup: 'fold into the commit above, message discarded',
    drop: 'do not replay it at all',
  },
  id: {
    pick: 'putar ulang apa adanya',
    reword: 'putar ulang, ganti pesannya',
    squash: 'gabung ke commit di atasnya, pesan digabung',
    fixup: 'gabung ke commit di atasnya, pesannya dibuang',
    drop: 'jangan diputar ulang sama sekali',
  },
}
