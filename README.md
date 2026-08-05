# Cangkok

**Simulator sejarah git dengan hash content-addressed sungguhan — supaya terlihat bahwa rebase tidak memindahkan commit, tapi membuat commit baru dan meninggalkan yang asli di rak.**

> *cangkok* / *mencangkok* — teknik hortikultura mengakarkan cabang ke batang lain. Persis yang dilakukan rebase.

Situs statis, tanpa backend. Baca [PRD.md](PRD.md) untuk cakupan dan [CLAUDE.md](CLAUDE.md) untuk cara bekerja di repo ini.

---

## Kenapa ada

[Learn Git Branching](https://learngitbranching.js.org) adalah tutorial yang lebih baik dan lebih lengkap, dan sebaiknya Anda pakai itu dulu. Cangkok bukan tutorial; ini sandbox, dan ia menunjukkan tiga hal yang tidak ditunjukkan visualiser lain:

- **Hash sungguhan, bukan `C1` `C2` `C3`.** Fakta terpenting tentang rebase adalah hasilnya objek yang berbeda dengan id yang berbeda. Dengan label berurutan, pelajarannya terhapus oleh notasinya.
- **Apa yang ditinggalkan.** Setelah rebase atau `reset --hard`, commit lama masih ada — hanya tidak ditunjuk siapa-siapa. Itu sumber hampir semua kepanikan git, dan obatnya.
- **Isi file yang nyata, jadi konflik yang nyata.**

## Sejujurnya soal hash

Hash di sini nyata dalam arti **diturunkan dari isi objek dan konsisten secara internal** — bukan identik dengan yang dihasilkan `git` di mesin Anda. Git ikut memasukkan waktu committer dan identitas penulis; Cangkok memakai jam virtual supaya setiap sesi bisa diulang persis.

Yang **memang identik** dengan git: id blob dan tree, karena serialisasinya sama persis dan keduanya tidak memuat waktu. Itu diuji terhadap oid yang direkam dari `git ls-tree`.

## Jalankan

```bash
pnpm install
pnpm dev
```

| Perintah | |
|---|---|
| `pnpm build` | export statis ke `./out` |
| `pnpm preview` | menyajikan `./out` di bawah basePath produksi |
| `pnpm test:run` | seluruh suite |
| `pnpm test:store` | invarian append-only dan content-addressing |
| `pnpm test:oracle` | kesesuaian struktural dengan fixture git asli |
| `pnpm test:determinism` | skrip yang sama → store byte-identik |
| `pnpm fixtures:record` | **hanya untuk pengembangan** — menjalankan `git` asli untuk merekam ulang fixture |
| `pnpm typecheck` / `pnpm lint` | |

## Bagaimana ini diuji

**Git asli sebagai oracle.** [`scripts/record-fixtures.mjs`](scripts/record-fixtures.mjs) menjalankan tujuh skenario lewat binary `git` yang sebenarnya dan merekam *strukturnya* — hubungan parent, posisi ref, commit mana yang berbagi tree, dan apakah commit yang ditandai selamat sebagai objek tak terjangkau. Fixture-nya tidak memuat satu hash pun: id commit memang berbeda karena git memasukkan waktu dan identitas, jadi menyamakannya justru salah.

Artinya klaim utama proyek ini datang dari git, bukan dari penalaran Cangkok. Rekaman gitnya sendiri yang melaporkan ujung branch sebelum rebase sebagai *ada tapi tak terjangkau*.

**Append-only, setiap kali.** Setiap perintah di setiap tes memeriksa bahwa semua objek yang ada sebelumnya masih ada dan byte-identik sesudahnya. Ini bukan suite terpisah, melainkan asersi setelah setiap perintah.

**Properti yang diajarkan.** Untuk integrasi tanpa konflik, merge dan rebase menghasilkan **tree akhir yang identik dan bentuk riwayat yang berbeda**. Itu tes kebenaran sekaligus isi dari mode banding.

**Determinisme.** Skrip yang sama menghasilkan store, refs, dan reflog yang byte-identik di mesin mana pun.

## Yang sengaja tidak ada

Bukan klien git, tidak menyentuh filesystem, tidak ada jaringan. Submodule, worktree, bisect, notes, LFS, packfile, dan strategi merge selain three-way ada di luar cakupan (PRD §4). Perintah yang tidak didukung **gagal dengan menyebut namanya** — tidak pernah diam-diam tidak melakukan apa-apa, dan tidak pernah menghasilkan jawaban yang masuk akal tapi salah.

Remote dan force-push (M7) belum ada.

## Struktur

```
lib/hash/     SHA-1 sinkron + serialisasi kanonik
lib/git/      engine. Murni: (state, command) → { state, events }
lib/layout/   penempatan lane DAG. Murni, snapshot-tested
components/   render state dan event; tidak menghitung apa pun
data/         skenario kurasi
tests/        store, oracle, revparse, determinism, layout, integrasi
```

## Lisensi

MIT.
