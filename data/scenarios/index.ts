/**
 * Curated starting states. PRD §6.8.
 *
 * A scenario is a script, not a snapshot: the engine is deterministic, so
 * replaying the lines builds the state, and the state can never disagree with
 * what the commands would actually do. Each one stops just before the
 * interesting command, and `next` names it, so the user runs it themselves.
 *
 * Ids are stable and readable because they appear in shared URLs.
 */
import type { Localized } from '@/lib/i18n/localized'

export interface Scenario {
  readonly id: string
  readonly title: Localized
  /** What this exists to teach. Shown before the user runs anything. */
  readonly lesson: Localized
  readonly script: readonly string[]
  /** The command to try next, and why. */
  readonly next: { readonly command: string; readonly why: Localized }
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'feature-behind-main',
    title: {
      en: 'A feature branch left behind main',
      id: 'Branch fitur tertinggal di belakang main',
    },
    lesson: {
      en: 'The commonest shape. After the rebase, watch every feature commit change its hash — not because the content changed, but because the parent did, and the parent is part of the hash.',
      id: 'Bentuk paling umum. Setelah rebase, perhatikan hash setiap commit fitur berubah — bukan karena isinya berubah, tapi karena parent-nya berubah, dan parent ikut masuk ke hash.',
    },
    script: [
      'write catatan.txt "baris satu"',
      'add catatan.txt',
      'commit -m "awal"',
      'branch fitur',
      'write main.txt "kerjaan orang lain"',
      'add main.txt',
      'commit -m "main bergerak"',
      'checkout fitur',
      'write fitur.txt "kerjaan saya"',
      'add fitur.txt',
      'commit -m "mulai fitur"',
      'write fitur.txt "kerjaan saya|selesai"',
      'add fitur.txt',
      'commit -m "selesaikan fitur"',
    ],
    next: {
      command: 'rebase main',
      why: {
        en: 'Two feature commits will be written as new objects; the old ones stay on the shelf, faded.',
        id: 'Dua commit fitur akan ditulis ulang jadi objek baru; yang lama tetap di rak, memudar.',
      },
    },
  },
  {
    id: 'messy-history',
    title: { en: 'A messy history to tidy up', id: 'Riwayat berantakan yang mau dirapikan' },
    lesson: {
      en: 'Three small commits that ought to be one. Interactive rebase folds them together — producing new objects rather than altering the old ones.',
      id: 'Tiga commit kecil yang sebaiknya jadi satu. Rebase interaktif menggabungkannya — dan menghasilkan objek baru, bukan mengubah yang lama.',
    },
    script: [
      'write app.txt "versi 1"',
      'add app.txt',
      'commit -m "fitur awal"',
      'branch rapikan',
      'checkout rapikan',
      'write app.txt "versi 2"',
      'add app.txt',
      'commit -m "wip"',
      'write app.txt "versi 3"',
      'add app.txt',
      'commit -m "typo"',
      'write app.txt "versi 4"',
      'add app.txt',
      'commit -m "wip lagi"',
    ],
    next: {
      command: 'open the interactive rebase panel',
      why: {
        en: 'Set the three steps to pick + squash + squash.',
        id: 'Ubah tiga langkah terakhir jadi pick + squash + squash.',
      },
    },
  },
  {
    id: 'published-branch',
    title: { en: 'A branch other people already have', id: 'Branch yang sudah dipublikasikan' },
    lesson: {
      en: 'Here rebase is the wrong tool. Commits other people already hold must not be rewritten — use revert, which adds to the history instead of changing it.',
      id: 'Di sini rebase adalah pilihan yang salah. Commit yang sudah dipegang orang lain tidak boleh ditulis ulang — pakai revert, yang menambah riwayat alih-alih mengubahnya.',
    },
    script: [
      'write rilis.txt "v1"',
      'add rilis.txt',
      'commit -m "rilis v1"',
      'tag v1',
      // Separate files, so reverting the middle commit is a clean operation —
      // the same reason you separate unrelated changes in real work.
      'write fitur-rusak.txt "kode yang ternyata bermasalah"',
      'add fitur-rusak.txt',
      'commit -m "fitur yang ternyata rusak"',
      'write catatan-rilis.txt "apa yang berubah"',
      'add catatan-rilis.txt',
      'commit -m "catatan rilis"',
    ],
    next: {
      command: 'revert HEAD~1',
      why: {
        en: 'Compare it with `reset --hard HEAD~2`: one is safe for collaborators, the other is not.',
        id: 'Bandingkan dengan `reset --hard HEAD~2`: yang satu aman untuk kolaborator, yang lain tidak.',
      },
    },
  },
  {
    id: 'accidental-hard-reset',
    title: { en: 'An accidental reset --hard', id: 'Reset --hard yang tidak disengaja' },
    lesson: {
      en: 'The situation that causes panic. The commit went nowhere: it is still in the store, still named by the reflog, and one command brings it back.',
      id: 'Situasi yang bikin panik. Commit-nya tidak ke mana-mana: masih di store, masih disebut reflog, dan bisa diambil kembali dengan satu perintah.',
    },
    script: [
      'write penting.txt "kerja seharian"',
      'add penting.txt',
      'commit -m "kerja seharian"',
      'write penting.txt "kerja seharian|dan semalaman"',
      'add penting.txt',
      'commit -m "dan semalaman"',
      'reset --hard HEAD~1',
    ],
    next: {
      command: 'reset --hard HEAD@{1}',
      why: {
        en: 'Look at the reflog panel: the “lost” commit is right there, faded but whole.',
        id: 'Lihat panel reflog: commit yang “hilang” ada di sana, memudar tapi utuh.',
      },
    },
  },
  {
    id: 'force-push-danger',
    title: { en: 'Rebasing a branch you already pushed', id: 'Rebase branch yang sudah di-push' },
    lesson: {
      en: 'This branch is already on origin. The rebase rewrites its commits, so the next push is rejected — and forcing it leaves the old commit on origin named by nothing. A colleague who already fetched still has it; anyone cloning today never will.',
      id: 'Branch ini sudah ada di origin. Rebase menulis ulang commit-nya, jadi push berikutnya ditolak — dan memaksanya membuat commit lama di origin tidak lagi ditunjuk apa pun. Rekan yang sudah fetch tetap memilikinya; yang clone hari ini tidak akan pernah melihatnya.',
    },
    script: [
      'write layanan.txt "versi awal"',
      'add layanan.txt',
      'commit -m "layanan awal"',
      'write layanan.txt "versi awal|tambahan"',
      'add layanan.txt',
      'commit -m "tambahan yang sudah dilihat orang"',
      'push origin main',
      'reset --hard HEAD~1',
      'write layanan.txt "versi awal|tambahan versi rapi"',
      'add layanan.txt',
      'commit -m "tambahan versi rapi"',
    ],
    next: {
      command: 'push origin main',
      why: {
        en: 'It will be rejected, and the message names which commit would be stranded. Compare with `push origin main --force`, then look at the origin panel.',
        id: 'Akan ditolak, dan pesannya menyebut commit mana yang akan terlantar. Bandingkan dengan `push origin main --force`, lalu lihat panel origin.',
      },
    },
  },
  {
    id: 'conflicting-rebase',
    title: { en: 'A rebase that conflicts', id: 'Rebase yang berkonflik' },
    lesson: {
      en: 'Two branches changed the same line. The rebase stops part-way without moving a ref or writing an object — and your resolution is what decides the resulting commit hash.',
      id: 'Dua branch mengubah baris yang sama. Rebase berhenti di tengah tanpa menggerakkan ref dan tanpa membuat objek — resolusi Anda yang menentukan hash commit hasilnya.',
    },
    script: [
      'write konfig.txt "port = 3000|host = localhost"',
      'add konfig.txt',
      'commit -m "konfigurasi awal"',
      'branch fitur',
      'write konfig.txt "port = 8080|host = localhost"',
      'add konfig.txt',
      'commit -m "main pakai 8080"',
      'checkout fitur',
      'write konfig.txt "port = 9000|host = localhost"',
      'add konfig.txt',
      'commit -m "fitur pakai 9000"',
    ],
    next: {
      command: 'rebase main',
      why: {
        en: 'Resolve it in the working-tree panel, `add konfig.txt`, then `rebase --continue`.',
        id: 'Selesaikan konflik di panel working tree, `add konfig.txt`, lalu `rebase --continue`.',
      },
    },
  },
]

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}
