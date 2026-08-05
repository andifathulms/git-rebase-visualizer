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
export interface Scenario {
  readonly id: string
  readonly title: string
  /** What this exists to teach. Shown before the user runs anything. */
  readonly lesson: string
  readonly script: readonly string[]
  /** The command to try next, and why. */
  readonly next: { readonly command: string; readonly why: string }
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'feature-behind-main',
    title: 'Branch fitur tertinggal di belakang main',
    lesson:
      'Bentuk paling umum. Setelah rebase, perhatikan hash setiap commit fitur berubah — bukan karena isinya berubah, tapi karena parent-nya berubah, dan parent ikut masuk ke hash.',
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
      why: 'Dua commit fitur akan ditulis ulang jadi objek baru; yang lama tetap di rak, memudar.',
    },
  },
  {
    id: 'messy-history',
    title: 'Riwayat berantakan yang mau dirapikan',
    lesson:
      'Tiga commit kecil yang sebaiknya jadi satu. Rebase interaktif menggabungkannya — dan menghasilkan objek baru, bukan mengubah yang lama.',
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
      command: 'buka panel rebase interaktif',
      why: 'Ubah tiga langkah terakhir jadi pick + squash + squash.',
    },
  },
  {
    id: 'published-branch',
    title: 'Branch yang sudah dipublikasikan',
    lesson:
      'Di sini rebase adalah pilihan yang salah. Commit yang sudah dipegang orang lain tidak boleh ditulis ulang — pakai revert, yang menambah riwayat alih-alih mengubahnya.',
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
      why: 'Bandingkan dengan `reset --hard HEAD~2`: yang satu aman untuk kolaborator, yang lain tidak.',
    },
  },
  {
    id: 'accidental-hard-reset',
    title: 'Reset --hard yang tidak disengaja',
    lesson:
      'Situasi yang bikin panik. Commit-nya tidak ke mana-mana: masih di store, masih disebut reflog, dan bisa diambil kembali dengan satu perintah.',
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
      why: 'Lihat panel reflog: commit yang “hilang” ada di sana, memudar tapi utuh.',
    },
  },
  {
    id: 'force-push-danger',
    title: 'Rebase branch yang sudah di-push',
    lesson:
      'Branch ini sudah ada di origin. Rebase menulis ulang commit-nya, jadi push berikutnya ditolak — dan memaksanya membuat commit lama di origin tidak lagi ditunjuk apa pun. Rekan yang sudah fetch tetap memilikinya; yang clone hari ini tidak akan pernah melihatnya.',
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
      why: 'Akan ditolak, dan pesannya menyebut commit mana yang akan terlantar. Bandingkan dengan `push origin main --force`, lalu lihat panel origin.',
    },
  },
  {
    id: 'conflicting-rebase',
    title: 'Rebase yang berkonflik',
    lesson:
      'Dua branch mengubah baris yang sama. Rebase berhenti di tengah tanpa menggerakkan ref dan tanpa membuat objek — resolusi Anda yang menentukan hash commit hasilnya.',
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
      why: 'Selesaikan konflik di panel working tree, `add konfig.txt`, lalu `rebase --continue`.',
    },
  },
]

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}
