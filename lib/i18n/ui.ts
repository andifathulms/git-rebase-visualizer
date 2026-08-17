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
  readonly enter: string
  readonly scenarios: string
  readonly compare: string
  readonly prior: string
  readonly honest: string

  readonly objects: string
  readonly orphans: string
  readonly detached: string
  readonly share: string
  readonly shared: string

  readonly commandBar: string
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

  // — Site chrome —
  readonly madeBy: string
  readonly navSandbox: string
  readonly navHome: string
  readonly language: string
  readonly skipToMain: string

  // — Home —
  readonly heroKicker: string
  readonly heroTitle: string
  readonly heroLead: string
  readonly heroPlain: string
  readonly newToGit: string
  readonly beforeRebase: string
  readonly afterRebase: string
  readonly diagramCaption: string
  readonly metaphorTitle: string
  readonly metaphorBox: string
  readonly metaphorBoxBody: string
  readonly metaphorCard: string
  readonly metaphorCardBody: string
  readonly metaphorOrphan: string
  readonly metaphorOrphanBody: string
  readonly stepsTitle: string
  readonly stepOne: string
  readonly stepOneBody: string
  readonly stepTwo: string
  readonly stepTwoBody: string
  readonly stepThree: string
  readonly stepThreeBody: string
  readonly honestTitle: string

  // — Workbench —
  readonly orientationTitle: string
  readonly orientationBody: string
  readonly orientationDismiss: string
  readonly objectsHelp: string
  readonly orphansHelp: string
  readonly headHelp: string
  readonly orphanBanner: string
  readonly openRegister: string
  readonly reset: string
  readonly resetHelp: string
  readonly shareHelp: string

  // — Graph —
  readonly graphTitle: string
  readonly legendCommit: string
  readonly legendUnreachable: string
  readonly legendRef: string
  readonly legendNew: string
  readonly legendHint: string
  readonly scrollHint: string

  // — Inspector —
  readonly inspectorTitle: string
  readonly inspectorEmpty: string
  readonly inspectorParents: string
  readonly inspectorNoParents: string
  readonly inspectorTree: string
  readonly inspectorRefs: string
  readonly inspectorNoRefs: string
  readonly inspectorUnreachable: string
  readonly inspectorFullOid: string
  readonly close: string

  // — Command bar —
  readonly suggestions: string
  readonly reference: string
  readonly referenceIntro: string
  readonly hideReference: string

  // — Rail tabs —
  readonly tabFiles: string
  readonly tabRemote: string
  readonly tabRebase: string
  readonly tabRegister: string

  // — Error boundary —
  readonly errorTitle: string
  readonly errorBody: string
  readonly errorSessionLabel: string
  readonly errorReplayWithoutLast: string
  readonly errorReplayAll: string
  readonly errorTryAgain: string
}

const EN: UiCopy = {
  enter: 'Open the repository',
  scenarios: 'Scenarios',
  compare: 'Compare',
  prior:
    'Learn Git Branching is the better and more complete tutorial. This is not a tutorial; it is a sandbox.',
  honest:
    'Hashes here are real in the sense of being content-derived and internally consistent — not identical to what git would produce on your machine, because git also folds in the committer time and the author identity. This simulator uses a virtual clock so every session replays exactly.',

  objects: 'objects',
  orphans: 'orphaned',
  detached: 'HEAD detached',
  share: 'Share URL',
  shared: 'Copied',

  commandBar: 'Command bar',
  commandHint:
    'Type a command and press enter — the same words a terminal takes. Nothing here can touch a real repository.',

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

  madeBy: 'Designed & built by',
  navSandbox: 'Sandbox',
  navHome: 'Home',
  language: 'Language',
  skipToMain: 'Skip to content',

  heroKicker: 'Real hashes · real orphans · real reflog',
  heroTitle: 'See what rebase actually does',
  heroLead:
    'Rebase does not move your commits. It writes new ones — with new hashes — and leaves the originals sitting on the shelf, unreferenced but not gone.',
  heroPlain:
    'Type real git commands and watch the objects appear, the hashes change, and the leftovers pile up. Nothing is installed, nothing is uploaded, and nothing you do here can break a real repository.',
  newToGit:
    'Never used rebase before? Start with a scenario — each one sets up a history and names the one command worth running next.',

  beforeRebase: 'Before',
  afterRebase: 'After rebase main',
  diagramCaption:
    'Same work, different objects. The two feature commits were copied onto a new base, so their hashes changed — and the originals are still on the shelf, pointed at by nothing.',

  metaphorTitle: 'Three things, and the whole model',
  metaphorBox: 'A commit is a box',
  metaphorBoxBody:
    'It holds a full snapshot and is named by a hash of its own contents — including which box came before it. Change what is inside, or change what came before, and it is a different box with a different name. Boxes are never edited.',
  metaphorCard: 'A branch is a card',
  metaphorCardBody:
    'A branch is just a card with a string running to one box. Moving a branch moves the string. It does not touch a single box. HEAD is the card marked in use.',
  metaphorOrphan: 'An orphan is a box with no card',
  metaphorOrphanBody:
    'After a rebase or a hard reset, the old boxes are still in the room — nothing points at them any more. That is what "I lost my work" actually means, and why the reflog gets it back.',

  stepsTitle: 'How to use it',
  stepOne: 'Pick a starting history',
  stepOneBody:
    'Open a scenario, or build your own with write, add, and commit. Every scenario is a script of commands that replays when you open it.',
  stepTwo: 'Run the command',
  stepTwoBody:
    'Type it in the command bar, exactly as you would in a terminal. Newly written objects are marked in red — that red is a hash that did not exist a moment ago.',
  stepThree: 'Look at what was left behind',
  stepThreeBody:
    'Faded boxes are unreachable, not deleted. The register lists every ref movement, and one click turns any orphan back into a branch.',

  honestTitle: 'What is real here, and what is not',

  orientationTitle: 'What you are looking at',
  orientationBody:
    'Left is the archive: each box is a commit, named by its hash, and each blue card is a branch with a string to the box it points at. Faded boxes are unreachable. Type commands underneath; the panels on the right hold your files, the peer repository, and the reflog.',
  orientationDismiss: 'Got it',

  objectsHelp: 'Objects in the store. This number only ever goes up, until gc.',
  orphansHelp: 'Commits no ref points at. Still stored, still recoverable from the reflog.',
  headHelp: 'Where HEAD points. Attached to a branch, the branch moves when you commit.',
  orphanBanner: 'box(es) now have no card pointing at them. Nothing was deleted.',
  openRegister: 'Open the register',
  reset: 'Start over',
  resetHelp: 'Clear the session and start from an empty repository.',
  shareHelp: 'Copy a link that replays exactly these commands.',

  graphTitle: 'The archive',
  legendCommit: 'commit',
  legendUnreachable: 'unreachable',
  legendRef: 'ref → commit',
  legendNew: 'new hash',
  legendHint: 'Select a box to inspect it.',
  scrollHint: 'Scroll to see the whole shelf.',

  inspectorTitle: 'Selected box',
  inspectorEmpty: 'Click a box in the archive to see what is inside it.',
  inspectorParents: 'Parents',
  inspectorNoParents: 'none — this is a root commit',
  inspectorTree: 'Tree',
  inspectorRefs: 'Pointed at by',
  inspectorNoRefs: 'nothing — this box has no card',
  inspectorUnreachable: 'Unreachable. Recoverable from the register until gc.',
  inspectorFullOid: 'Full hash',
  close: 'Close',

  suggestions: 'Try',
  reference: 'Commands',
  referenceIntro:
    'Anything not on this list fails loudly rather than guessing — a plausible wrong answer is the worst thing this could give you.',
  hideReference: 'Hide',

  tabFiles: 'Files',
  tabRemote: 'Peer',
  tabRebase: 'Rebase -i',
  tabRegister: 'Register',

  errorTitle: 'Something broke — the session did not',
  errorBody:
    'A session here is only a list of command lines, not a snapshot, so nothing is lost. The lines that got you here are below.',
  errorSessionLabel: 'What ran',
  errorReplayWithoutLast: 'Replay without the last line',
  errorReplayAll: 'Replay all of it',
  errorTryAgain: 'Try again',
}

const ID: UiCopy = {
  enter: 'Buka repositori',
  scenarios: 'Skenario',
  compare: 'Banding',
  prior:
    'Learn Git Branching adalah tutorial yang lebih baik dan lebih lengkap. Ini bukan tutorial; ini sandbox.',
  honest:
    'Hash di sini nyata dalam arti diturunkan dari isi objek dan konsisten secara internal — bukan identik dengan yang dihasilkan git di mesin Anda, karena git ikut memasukkan waktu committer dan identitas penulis. Simulator ini memakai jam virtual supaya setiap sesi bisa diulang persis.',

  objects: 'objek',
  orphans: 'yatim',
  detached: 'HEAD detached',
  share: 'Bagikan URL',
  shared: 'Tersalin',

  commandBar: 'Command bar',
  commandHint:
    'Ketik sebuah perintah lalu tekan enter — kata yang sama dengan yang diterima terminal. Tidak ada yang bisa menyentuh repositori sungguhan dari sini.',

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

  madeBy: 'Dirancang & dibangun oleh',
  navSandbox: 'Sandbox',
  navHome: 'Beranda',
  language: 'Bahasa',
  skipToMain: 'Lewati ke konten',

  heroKicker: 'Hash nyata · commit yatim nyata · reflog nyata',
  heroTitle: 'Lihat apa yang sebenarnya dilakukan rebase',
  heroLead:
    'Rebase tidak memindahkan commit Anda. Ia menulis commit baru — dengan hash baru — dan meninggalkan yang asli di rak, tanpa ada yang menunjuknya, tapi belum hilang.',
  heroPlain:
    'Ketik perintah git sungguhan, lalu perhatikan objeknya muncul, hash-nya berubah, dan sisa-sisanya menumpuk. Tidak ada yang dipasang, tidak ada yang diunggah, dan tidak ada yang Anda lakukan di sini bisa merusak repositori sungguhan.',
  newToGit:
    'Belum pernah pakai rebase? Mulai dari skenario — masing-masing menyiapkan sebuah riwayat dan menyebutkan satu perintah yang layak dicoba berikutnya.',

  beforeRebase: 'Sebelum',
  afterRebase: 'Sesudah rebase main',
  diagramCaption:
    'Kerja yang sama, objek yang berbeda. Dua commit fitur disalin ke basis baru, jadi hash-nya berubah — dan yang asli masih di rak, tidak ditunjuk apa pun.',

  metaphorTitle: 'Tiga hal, dan seluruh modelnya',
  metaphorBox: 'Commit itu kotak',
  metaphorBoxBody:
    'Isinya snapshot utuh, dan namanya adalah hash dari isinya sendiri — termasuk kotak mana yang datang sebelumnya. Ubah isinya, atau ubah yang sebelumnya, maka itu kotak lain dengan nama lain. Kotak tidak pernah disunting.',
  metaphorCard: 'Branch itu kartu',
  metaphorCardBody:
    'Branch hanyalah kartu dengan benang yang menuju satu kotak. Memindahkan branch berarti memindahkan benangnya. Tidak ada satu kotak pun yang tersentuh. HEAD adalah kartu yang bertanda sedang dipakai.',
  metaphorOrphan: 'Yatim itu kotak tanpa kartu',
  metaphorOrphanBody:
    'Sesudah rebase atau hard reset, kotak lamanya masih ada di ruangan — hanya saja tidak ada lagi yang menunjuknya. Itulah arti sebenarnya dari "kerjaan saya hilang", dan itu sebabnya reflog bisa mengembalikannya.',

  stepsTitle: 'Cara memakainya',
  stepOne: 'Pilih riwayat awal',
  stepOneBody:
    'Buka sebuah skenario, atau susun sendiri dengan write, add, dan commit. Setiap skenario adalah skrip perintah yang diputar ulang saat dibuka.',
  stepTwo: 'Jalankan perintahnya',
  stepTwoBody:
    'Ketik di command bar, persis seperti di terminal. Objek yang baru ditulis ditandai merah — merah itu adalah hash yang sedetik lalu belum ada.',
  stepThree: 'Lihat apa yang tertinggal',
  stepThreeBody:
    'Kotak yang memudar berarti tak terjangkau, bukan terhapus. Register mencatat setiap pergerakan ref, dan satu klik mengubah kotak yatim kembali jadi branch.',

  honestTitle: 'Apa yang nyata di sini, dan apa yang tidak',

  orientationTitle: 'Apa yang sedang Anda lihat',
  orientationBody:
    'Sebelah kiri adalah arsipnya: tiap kotak adalah commit, dinamai oleh hash-nya, dan tiap kartu biru adalah branch dengan benang menuju kotak yang ditunjuknya. Kotak yang memudar tidak terjangkau. Ketik perintah di bawahnya; panel di kanan berisi file Anda, repositori rekan, dan reflog.',
  orientationDismiss: 'Mengerti',

  objectsHelp: 'Objek di store. Angka ini hanya bertambah, sampai gc dijalankan.',
  orphansHelp: 'Commit yang tak ditunjuk ref mana pun. Masih tersimpan, masih bisa diselamatkan lewat reflog.',
  headHelp: 'Tempat HEAD menunjuk. Kalau menempel di branch, branch-nya ikut maju saat Anda commit.',
  orphanBanner: 'kotak kini tak ditunjuk kartu mana pun. Tidak ada yang dihapus.',
  openRegister: 'Buka register',
  reset: 'Mulai ulang',
  resetHelp: 'Kosongkan sesi dan mulai dari repositori kosong.',
  shareHelp: 'Salin tautan yang memutar ulang persis perintah-perintah ini.',

  graphTitle: 'Arsip',
  legendCommit: 'commit',
  legendUnreachable: 'tak terjangkau',
  legendRef: 'ref → commit',
  legendNew: 'hash baru',
  legendHint: 'Pilih sebuah kotak untuk memeriksanya.',
  scrollHint: 'Geser untuk melihat seluruh rak.',

  inspectorTitle: 'Kotak terpilih',
  inspectorEmpty: 'Klik sebuah kotak di arsip untuk melihat isinya.',
  inspectorParents: 'Parent',
  inspectorNoParents: 'tidak ada — ini commit pertama',
  inspectorTree: 'Tree',
  inspectorRefs: 'Ditunjuk oleh',
  inspectorNoRefs: 'tidak ada — kotak ini tanpa kartu',
  inspectorUnreachable: 'Tak terjangkau. Masih bisa diselamatkan lewat register sampai gc.',
  inspectorFullOid: 'Hash lengkap',
  close: 'Tutup',

  suggestions: 'Coba',
  reference: 'Perintah',
  referenceIntro:
    'Apa pun yang tidak ada di daftar ini akan gagal dengan jelas, bukan menebak — jawaban salah yang terdengar meyakinkan adalah hal terburuk yang bisa diberikan alat ini.',
  hideReference: 'Sembunyikan',

  tabFiles: 'File',
  tabRemote: 'Rekan',
  tabRebase: 'Rebase -i',
  tabRegister: 'Register',

  errorTitle: 'Ada yang rusak — sesinya tidak',
  errorBody:
    'Sesi di sini hanya daftar baris perintah, bukan snapshot, jadi tidak ada yang hilang. Baris yang membawa Anda ke sini ada di bawah.',
  errorSessionLabel: 'Yang berjalan',
  errorReplayWithoutLast: 'Putar ulang tanpa baris terakhir',
  errorReplayAll: 'Putar ulang semuanya',
  errorTryAgain: 'Coba lagi',
}

export const UI: Record<Locale, UiCopy> = { en: EN, id: ID }

/**
 * One line per supported command, so the reference is readable by someone who
 * does not already know what the command does. Each line states what the
 * command does to *objects and refs*, because that is the thing this project
 * exists to make visible — not a paraphrase of the man page synopsis.
 */
export const COMMAND_HELP: Record<Locale, Record<string, string>> = {
  en: {
    write: 'edit a file in the working tree. Not a git command — nothing enters the store.',
    add: 'copy the working-tree content of a path into the index.',
    commit: 'write the index as a tree, and a new commit object pointing at it.',
    branch: 'create a card at a commit. The card moves; the box never does.',
    checkout: 'move HEAD, and make the working tree match it.',
    switch: 'move HEAD to a branch. Same as checkout, but only for branches.',
    merge: 'join two histories: a new commit with two parents, or a fast-forward.',
    rebase: 'replay commits onto a new base as new objects. The originals stay.',
    'cherry-pick': "copy one commit's change onto HEAD as a new commit.",
    reset: 'move a branch card. --soft, --mixed and --hard differ in what else follows.',
    revert: 'write a new commit that undoes an old one. Nothing is rewritten.',
    tag: 'name a commit.',
    log: 'walk the history backwards from a commit.',
    status: 'what differs between HEAD, the index, and the working tree.',
    reflog: 'every ref movement — the only route back to an orphaned commit.',
    gc: 'delete unreachable objects. The one command here that removes anything.',
    push: 'move a ref on the peer, sending whatever commits it lacks.',
    fetch: "bring the peer's refs down as remote-tracking refs. Nothing local moves.",
    remote: 'show the peer.',
    diff: 'compare two commits, or a commit against the working tree.',
  },
  id: {
    write: 'menyunting file di working tree. Bukan perintah git — belum ada yang masuk store.',
    add: 'menyalin isi sebuah path dari working tree ke index.',
    commit: 'menulis index jadi sebuah tree, dan objek commit baru yang menunjuknya.',
    branch: 'membuat kartu di sebuah commit. Kartunya yang berpindah; kotaknya tidak pernah.',
    checkout: 'memindahkan HEAD, dan menyamakan working tree dengannya.',
    switch: 'memindahkan HEAD ke sebuah branch. Sama seperti checkout, tapi khusus branch.',
    merge: 'menyatukan dua riwayat: satu commit baru dengan dua parent, atau fast-forward.',
    rebase: 'memutar ulang commit ke basis baru sebagai objek baru. Yang asli tetap tinggal.',
    'cherry-pick': 'menyalin perubahan satu commit ke atas HEAD sebagai commit baru.',
    reset: 'memindahkan kartu branch. --soft, --mixed, dan --hard beda pada apa yang ikut.',
    revert: 'menulis commit baru yang membatalkan commit lama. Tidak ada yang ditulis ulang.',
    tag: 'memberi nama pada sebuah commit.',
    log: 'menyusuri riwayat mundur dari sebuah commit.',
    status: 'apa yang berbeda antara HEAD, index, dan working tree.',
    reflog: 'setiap pergerakan ref — satu-satunya jalan kembali ke commit yatim.',
    gc: 'menghapus objek yang tak terjangkau. Satu-satunya perintah di sini yang menghapus.',
    push: 'memindahkan ref di sisi rekan, mengirim commit yang belum ada di sana.',
    fetch: 'menarik ref rekan jadi remote-tracking ref. Tidak ada yang bergerak di lokal.',
    remote: 'menampilkan sisi rekan.',
    diff: 'membandingkan dua commit, atau sebuah commit dengan working tree.',
  },
}

/**
 * Starter lines for the command bar. Git commands are English in both locales
 * (PRD §9), so this table has no translation — it is the same keystrokes a
 * terminal would take.
 */
export const STARTER_LINES: readonly string[] = [
  'status',
  'log',
  'write notes.txt "one|two"',
  'add notes.txt',
  'commit -m "a change"',
  'branch feature',
  'rebase main',
  'reflog',
]

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
