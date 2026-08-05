/**
 * Scenario scripts shared by the fixture recorder and the oracle test, so both
 * sides are provably running the same thing. Plain JS, because the recorder is
 * a node script that shells out to the real `git` binary.
 *
 * The script language is git, plus three helpers the recorder and the engine
 * both understand:
 *
 *   write <path> <line>|<line>   write a file in the working tree
 *   mark <name>                  remember the current HEAD oid under a name
 *   @mark:<name>                 substituted with that oid anywhere in a line
 *
 * Commit messages are unique within each scenario's reachable history, which is
 * what lets the fixture describe structure by message instead of by hash.
 */
export const SCENARIOS = [
  {
    id: 'feature-behind-main',
    lesson:
      'Rebase memutar ulang commit ke basis baru; yang lama tetap ada tanpa ada yang menunjuknya.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'branch fitur',
      'write main.txt dari-main',
      'add main.txt',
      'commit -m B',
      'checkout fitur',
      'write fitur.txt dari-fitur',
      'add fitur.txt',
      'commit -m C',
      'write fitur.txt dari-fitur|lagi',
      'add fitur.txt',
      'commit -m D',
      'mark sebelum-rebase',
      'rebase main',
    ],
  },
  {
    id: 'merge-instead-of-rebase',
    lesson: 'Merge menambah satu commit dengan dua parent dan tidak menulis ulang apa pun.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'branch fitur',
      'write main.txt dari-main',
      'add main.txt',
      'commit -m B',
      'checkout fitur',
      'write fitur.txt dari-fitur',
      'add fitur.txt',
      'commit -m C',
      'checkout main',
      'merge fitur --no-ff -m M',
    ],
  },
  {
    id: 'fast-forward',
    lesson: 'Fast-forward tidak membuat commit sama sekali — kartu branch hanya bergeser.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'branch fitur',
      'checkout fitur',
      'write b.txt dua',
      'add b.txt',
      'commit -m B',
      'checkout main',
      'merge fitur',
    ],
  },
  {
    id: 'accidental-hard-reset',
    lesson: 'reset --hard tidak menghapus objek; commit-nya masih ada dan bisa diambil kembali.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'write a.txt satu|dua',
      'add a.txt',
      'commit -m B',
      'mark yang-hilang',
      'reset --hard HEAD~1',
      'branch penyelamat @mark:yang-hilang',
    ],
  },
  {
    id: 'cherry-pick-one',
    lesson: 'Cherry-pick menyalin sebuah commit; asli dan salinannya sama-sama ada.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'branch fitur',
      'checkout fitur',
      'write perbaikan.txt tambal',
      'add perbaikan.txt',
      'commit -m P',
      'mark asli',
      'checkout main',
      'write main.txt dari-main',
      'add main.txt',
      'commit -m B',
      'cherry-pick @mark:asli',
    ],
  },
  {
    id: 'revert-a-commit',
    lesson: 'Revert menambah commit baru yang membatalkan; riwayat tidak ditulis ulang.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'write a.txt satu|dua',
      'add a.txt',
      'commit -m B',
      'revert HEAD --no-edit',
    ],
  },
  {
    id: 'messy-history',
    lesson: 'Rantai panjang yang diputar ulang: setiap commit jadi objek baru.',
    script: [
      'write a.txt satu',
      'add a.txt',
      'commit -m A',
      'branch fitur',
      'write main.txt dari-main',
      'add main.txt',
      'commit -m U',
      'checkout fitur',
      'write f1.txt satu',
      'add f1.txt',
      'commit -m F1',
      'write f2.txt dua',
      'add f2.txt',
      'commit -m F2',
      'write f3.txt tiga',
      'add f3.txt',
      'commit -m F3',
      'mark ujung-lama',
      'rebase main',
    ],
  },
]
