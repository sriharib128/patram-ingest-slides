# Patram-Ingest talk deck

A 34-slide animated HTML deck (1920×1080, scales to any screen). Same palette and type as the *Patram Infra* deck.

## Present it

Open **`dist/patram-ingest-talk.html`** in Chrome. It is one self-contained file (fonts and images inlined), so it works offline on conference wifi.

| Key | Does |
|---|---|
| → / Space / click right | next step, then next slide |
| ← / click left | back |
| **P** | open the **presenter window** (notes, next-slide title, clock, pace vs plan). Put the main window on the projector. |
| **K** | skip the *optional* slides (none at the moment; core path ≈ 30 min) |
| **O** | overview grid, click to jump |
| **F** | fullscreen · **T** clock overlay · **B** blackout · **R** reset clock |

Most slides now show everything at once; a few reveal in steps (the shared-queue and inbox slides, the close). Small looping icons inside cards are ambient and need no control. Anything that **plays by itself as a story** (the page journey, GPU timelines, stage-by-stage vs pipeline parallel, the shared queue) has a bar with **Pause / Replay and a slider**, so you can stop it or drag back to any moment. Pressing → still moves on to the next slide. The `#N` in the URL jumps to slide N.

## Structure

Context (what we do, the scale: 100M+ examples, 100B+ tokens, 500+ GPUs, runs that last weeks) · **1 The problem** (three things stop a weeks-long run: nodes die, GPUs are lent out, work spans nodes; so the engine needs three things) · **2 Keeping the GPUs busy** (one page is a chain of calls, the GPU is one step, inside one node, processes/threads/event loops from first principles, which piece runs where, one shared queue and its lock bug, a private inbox per worker, any backend) · **3 Never losing work** (save first then mark done, nodes take work from one table, the run heals and scales itself, every error followed to the end) · **4 Graphs of stages** (not yet reworked) · **5 Scaling** (vs DBOS and Temporal, why the overhead stays small) · six lessons and the close. Each part opens with a short divider slide; a small act tracker top-right shows where you are.

`SPEAKER_NOTES.md` is the full script with timing per slide (generated from the deck).

## Edit and rebuild

```
src/slides/NN-*.html   one slide each (notes live in <aside class="notes">; data-time = minutes)
src/css/*.css          styles          src/js/anim-*.js   per-slide animations
python3 tools/build.py                 rebuilds index.html, dist/…html and SPEAKER_NOTES.md
```

Fonts are in `fonts/`, images in `assets/`.

## Things to know before you present

- Several visuals are **illustrative simulations**, labelled on the slide: the six-page routing graph (the real pipeline has 17 agents), the counters in stage-by-stage vs pipeline-parallel (1,000,000 examples is illustrative; the 10.7 vs 81 minutes is measured), and the shared-queue story (a scripted run). The numbers on the benchmark, tuning, fault-injection and incident slides come from the changelog and docs.
- The `patram://` address, the SQL and the `WorkerSpec` snippet are sketches of the real shapes.
- Speaker photos are in `assets/speaker-anirudh.jpg` and `assets/speaker-srihari.jpg`; replace and rebuild to change them.
- The first slide has no conference name; add it if you want one.
- Self-healing and scaling are shown as they are built (paper §3.2): a supervisor restarts workers, a watcher restarts the program and the vLLM servers, pools re-read the server list every 30 s, and a node joins by starting the program. A scheduler that decides on its own to add nodes is not built; the close notes say so if asked.
- The 100M+ / 100B+ / 500+ numbers on slide 4 are the scale we work at, as given by the speakers; Patram 1.5's own figures (50.8M examples, 41.3B tokens, up to 49 nodes) are in the notes.

## Round 4 changes (2026-10-23)

- Part labels at the top right are clickable and jump to that part.
- Removed the speakers slide; page journey now follows the scale slide.
- Graph part rebuilt: paths per page type → one pipeline graph (routing, wait for any, wait for all) → dynamic DAG → why it is hard → pipeline parallel → five needs → options weighed → two-bitmask ledger → StageWeaver → author workflow.
- Fleet slide is three steps: heals itself, scales by itself (drain, return work, wait, resume), one-day throughput chart.
- 36 slides, core path about 34 minutes.
