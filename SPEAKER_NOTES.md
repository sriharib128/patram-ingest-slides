# Patram-Ingest talk: speaker notes

Generated from the deck. Keys: → next · ← back · F fullscreen · O overview · P presenter window · K skip optional slides · T clock · B blackout.

| # | Slide | min | cumulative (core path) |
|---|---|---|---|
| 1 | Patram-Ingest: durable execution around vLLM | 0.3 | 0.3 |
| 2 | What we do: the Patram stack | 0.8 | 1.1 |
| 3 | The scale a foundation model needs | 0.6 | 1.7 |
| 4 | What one training example looks like | 1.2 | 2.9 |
| 5 | Part zero · The problem | 0.2 | 3.1 |
| 6 | Three things that interrupt a weeks-long run | 1.2 | 4.3 |
| 7 | Three requirements for the engine | 0.8 | 5.1 |
| 8 | Part one · Keeping the GPUs busy | 0.2 | 5.3 |
| 9 | The model run is one of three steps | 1 | 6.3 |
| 10 | Inside one node | 1.1 | 7.4 |
| 11 | Processes, threads and event loops | 1.5 | 8.9 |
| 12 | Your turn: which parallelism where? | 0.8 | 9.7 |
| 13 | What we chose for each piece | 1 | 10.7 |
| 14 | Sharing work through one queue | 1.1 | 11.8 |
| 15 | A private inbox per worker | 1.1 | 12.9 |
| 16 | A worker can run any backend | 1 | 13.9 |
| 17 | Part two · Crash safe | 0.2 | 14.1 |
| 18 | Nodes take work from one table | 1.6 | 15.7 |
| 19 | Recovery and scaling without intervention | 3.2 | 18.9 |
| 20 | Every error is followed through | 1 | 19.9 |
| 21 | Part three · Graphs of stages | 0.2 | 20.1 |
| 22 | One pipeline, a different route for every page | 1.2 | 21.3 |
| 23 | The whole pipeline is a graph | 2 | 23.3 |
| 24 | A dynamic DAG fits our workloads | 0.8 | 24.1 |
| 25 | From idea to a running pipeline | 0.8 | 24.9 |
| 26 | All stages at once | 1.2 | 26.1 |
| 27 | What Patram-Ingest supports | 0.6 | 26.7 |
| 28 | Scaling compared with DBOS and Temporal | 1.5 | 28.2 |
| 29 | Key takeaways | 1 | 29.2 |
| 30 | The DB is the single source of truth | 0.8 | 30.0 |
| 31 | Where Patram-Ingest sits in the stack | 1.2 | 31.2 |
| 32 | Thank you | 0.6 | 31.8 |
| 33 | Part five · Q&amp;A *(optional)* | 0.2 | - |
| 34 | The remaining question *(optional)* | 0.4 | - |
| 35 | Question 1: which order survives the crash? *(optional)* | 1.2 | - |
| 36 | Question 2: who decides that Grounded Q&amp;A can start? *(optional)* | 1.3 | - |
| 37 | Take-home: how should the database coordinate the stages? *(optional)* | 0.6 | - |


**Core path ≈ 31.8 min.** Optional slides add the remainder; press **K** to skip them all.

## 1. Patram-Ingest: durable execution around vLLM
*Context · ~0.3 min · no steps*

We are from the Vision team at BharatGen. Patram is our vision-language model for Indian documents. This talk is about the system that generated its training data: Patram-Ingest, and specifically the layer around vLLM that decides whether the GPUs stay busy and whether a crash costs us any work.

Structure: first the problem, then how we keep the GPUs busy, how it stays crash safe, how a page moves through a graph of models, and finally how it scales.

## 2. What we do: the Patram stack
*Context · ~0.8 min · no steps*

What we do: the Vision team at BharatGen builds sovereign vision foundation models for Indian documents. The model reads the page image directly, so layout, tables and stamps are not lost on the way.

This is our stack as a pyramid, read from the bottom up. At the base is storage: our own file system and database. On it, we collect raw data, scraped and synthetic documents, and beside that sits our annotation and visualization tool, DarshinAI. Above that is training data generation: that is Patram-Ingest, what this talk is about, which turns raw pages into training data. Then the training infrastructure. Then the models, the Patram Suite, shown on the right: multi-task foundation models, the Patram series, the current one covering 34 tasks and the next adding more than 22 Indian languages; task-specific models for grounding, layout and grounded reasoning; and agents such as PatramParse. At the top, evaluation measures all of it. Everything above the ETL layer is trained or measured on data Patram-Ingest produced.

## 3. The scale a foundation model needs
*Context · ~0.6 min · no steps*

This is the scale a foundation model needs, and the scale we work at: more than 100 terabytes of image data, more than 100 million training examples, more than 100 billion tokens of model output, generated on more than 500 GPUs. For Patram 1.5 alone it was more than 50 million examples and 41 billion tokens, and every release needs more.

At that size, generating the data is not a script you run overnight. It is a workflow that has to keep going, without interruption, for weeks. Hold on to that phrase, because the rest of the talk is about what gets in its way.

## 4. What one training example looks like
*Context · ~1.2 min · no steps*

Before the problems, what does a model actually learn from? Examples, millions of them. Here is one. The input is the image of a page, here an electricity bill. The example pairs it with a question, "What is the payment due date?", the answer, "15 July 2015", and where on the page the answer is: the orange box. A model that sees millions of these learns to read documents and to point at its evidence.

Who writes these? Not people: there are far too many. They are made automatically, in a chain. One model understands what the page is. Another writes a question. Another answers it from the page. And a last one verifies the answer against the page. Each call needs the output of the one before.

The same page also teaches other things: reading all its text, finding the tables, turning a table into rows. Now multiply by a hundred million pages, in more than 22 languages. That is the workload this talk is about.

## 5. Part zero · The problem
*0 · The problem · ~0.2 min · no steps*

So far: we build foundation models, and the data for them comes from runs that must keep going for weeks. Part zero is what makes that hard on a real, shared cluster, and what the engine therefore has to do.

## 6. Three things that interrupt a weeks-long run
*0 · The problem · ~1.2 min · no steps*

We just said a run must keep going for weeks. On a real cluster, three things get in the way, and the engine has to handle all three by itself.

One: nodes die and restart. Over weeks, nodes crash, reboot, run out of memory or are taken back. The run has to recover on its own: notice what died, restart it, and carry on, without a person watching.

Two: GPUs are lent out. The cluster is shared, so we sometimes lend GPUs to another team for a while. The run should carry on with fewer, and when the GPUs come back it should scale up and use them again on its own, without a restart.

Three: complex workloads need pipeline parallelism. A page goes through several model stages, and we want every stage running at the same time, with stages spread over different nodes.

If asked whether this really happens: in one run, nine of 24 nodes stopped working, and nobody noticed for six hours, because nothing was in place to notice.

## 7. Three requirements for the engine
*0 · The problem · ~0.8 min · no steps*

From those problems come three needs, and we take them in order.

First, busy GPUs. The GPUs are the expensive part of the cluster, and part one is about never letting them wait for anything: not the host, not the disk, not another stage.

Second, crash safety. Nodes die and GPUs come and go, and when the dust settles the output must still hold every record exactly once, without a person cleaning up. That is part two. Normally this need is expensive, because engines that survive crashes write every step to a database; part two shows how we avoid that.

Third, any workflow with very little code. Once someone can picture a pipeline, with stages that branch and merge on what the data contains, getting it running across every node should take a few lines of code and one command. Coordination, retries and scaling should come for free. That is part three.

First, busy GPUs.

## 8. Part one · Keeping the GPUs busy
*1 · Keeping the GPUs busy · ~0.2 min · no steps*

We have the problem and the three needs. We take the first one first: how to keep the GPUs busy. This is the part where we build up from first principles: what a GPU is waiting for, and how a program should wait.

## 9. The model run is one of three steps
*1 · Keeping the GPUs busy · ~1 min · reveal steps: 1*

Start with what the GPU actually does. For every batch of pages, the model run is one step. Before it, the host has to build prompts and read and check images. After it, the host has to parse and validate the answers, write them to disk and record that they are done. The GPU does only the middle part.

**[step 1]** Two ways to run the same four batches, on one clock. Press play, or drag the slider. Top: one batch at a time. The host prepares, then the GPU runs, then the host finishes, and the GPU sits idle while the host works. Bottom: overlapped. The host prepares the next batch and finishes the last one while the GPU runs this one. The same host work is still done, but none of it is on the GPU's critical path, so the whole run ends sooner and the GPU lane is continuous. So the question is not how to make the host faster; it is how to make sure the host is always one batch ahead. That means many pieces of host code running at the same time as the GPU. Next: what those pieces are.

## 10. Inside one node
*1 · Keeping the GPUs busy · ~1.1 min · no steps*

Here is what runs on every node, before we talk about how. Every node runs the same program; there is no master node.

On the left, a stage worker, one per stage of the pipeline. It has four jobs. Prepare claims samples and builds the model requests. Collect gathers the results as they come back. Write saves them to disk and then marks them done. Upload moves finished files to the object store.

In the middle, the worker pool, shared by the stages. A dispatcher hands each request to a worker. There is one worker per model server, GPU, browser or CPU slot, and each worker calls a backend. A supervisor restarts any worker that dies.

On the right, the backends a worker can call: vLLM servers, Hugging Face models, a CPU process such as page rendering, or any classic model such as SAM3 or YOLO. And around everything, a small watcher restarts the whole program if it exits or the node reboots.

All of these pieces must run at the same time, or the GPU waits, as we just saw. So for each one we have to choose the right kind of parallelism. First, the three options.

## 11. Processes, threads and event loops
*1 · Keeping the GPUs busy · ~1.5 min · no steps*

Before we decide where each piece runs, the first principles. There are three ways to have a computer do many things at once, and each is good at one thing.

A process is a separate program with its own memory and its own Python interpreter. Processes really run in parallel, even Python code, and if one crashes the others keep going. The cost: they are heavier, and data has to be copied between them. So processes are for CPU-heavy work, for anything that might crash, and for anything that owns a GPU.

Threads are helpers inside one program. They are the easy option, because they share memory: handing a result to another thread is just passing an object, nothing is copied. The catch in Python is the GIL: only one thread runs Python at a time. That is fine while a thread is waiting on the disk, the network or the database, because waiting releases the GIL, but it is bad for CPU work. And a crash takes the whole program down. So threads are for waiting.

An event loop is one thread that juggles many waits. Each call starts, waits for its answer, and while it waits the loop runs the others. Hundreds of calls can be in flight almost for free, and there are no locks because only one thing runs at a time. But one slow step that does not wait properly blocks every call. So event loops are for many model calls at once.

Rule of thumb, under each column: computing, a process; waiting, a thread; many waits at once, an event loop.

## 12. Your turn: which parallelism where?
*1 · Keeping the GPUs busy · ~0.8 min · no steps*

Now that you know the three options, here is the node again. Every one of these boxes has to run at the same time. Over to you: which ones would you make processes, which threads, and which an event loop? A hint: ask of each box whether it computes, whether it mostly waits, or whether it juggles many calls at once. Take a few answers from the room before moving on.

## 13. What we chose for each piece
*1 · Keeping the GPUs busy · ~1 min · no steps*

Here is what we chose: the same picture, coloured by kind.

Processes, in blue: each stage worker, the pool, and each model worker. These do CPU work in Python, such as checking images and handling JSON, so they need their own interpreter. A crash, for example an out-of-memory kill, takes down one process and nothing else. And a GPU is owned by exactly one process. We learned this the hard way: early versions ran the model in the same process as up to ten stages, and the shared interpreter lock was the first bottleneck.

Threads, in purple: inside a stage worker, prepare, collect, write and upload are threads, and in the pool so are the dispatcher and the supervisor. They spend their time waiting on the database, on fsync or on the network, and waiting releases the lock, so threads overlap well. Handing a result from one to the next is just passing an object.

Event loops, in orange: inside each model worker, one asyncio loop keeps many calls in flight, for example 24 requests per vLLM server, each handled as its answer arrives. One thread, no lock, many waits.

## 14. Sharing work through one queue
*1 · Keeping the GPUs busy · ~1.1 min · reveal steps: 1*

We now have several workers, and requests to hand out. How do we balance the load between them? The easiest way is one shared queue: put every request in it, and let each worker pull the next one when it is free. A fast worker simply pulls more often, so the load balances itself.

Look at what a pull does inside. The worker takes the queue's lock, pulls one request, and releases the lock. Only one worker holds the lock at any moment; you can see it passing between them.

**[step 1]** Now a worker is killed, for example by an out-of-memory kill, at the moment it holds the lock. A killed process runs no cleanup, so the lock is never released. Every other worker is now waiting for a lock that nobody will ever give back. The supervisor restarts the dead worker, and the new one waits on the same lock. So the pool reports itself healthy, with every worker alive, but throughput is zero. There is no error and no timeout; the run just stops. This happened to us: in a test that killed one of two workers mid-request, the pool hung in three of eight trials.

## 15. A private inbox per worker
*1 · Keeping the GPUs busy · ~1.1 min · reveal steps: 2*

The fix is not a safer lock. Holding a lock when you are killed is how the primitive works. The fix is to take the shared lock away from anything that can be killed. One dispatcher, a thread in the pool, is the only reader of the shared queue. It hands each request to a free worker by putting it in that worker's own inbox. Each worker reads only its own inbox.

**[step 1]** Now kill a worker. The worst it can do is block its own inbox, and that inbox is thrown away with it. The dispatcher sees the worker is gone and stops sending to it. The other workers never shared anything with it, so they keep working.

**[step 2]** The supervisor starts a new worker with a fresh, empty inbox, and the requests the dead worker owed come back as system errors and are sent again. The rule we took from this: never share a lock with a process that can die. Since the change, the same kill test has not hung once, and with one of four workers killed all 40 test images were committed. One limit we state honestly: results still travel back on shared queues, so the same kind of failure is possible there, in a much narrower window.

## 16. A worker can run any backend
*1 · Keeping the GPUs busy · ~1 min · no steps*

So what actually runs inside one of those worker processes? Anything that fits three functions: initialise, call and terminate. The pool, the inboxes, the supervisor and the error handling are the same whatever the backend is.

Most of our work calls hosted vLLM servers over HTTP: shared servers that many pipelines use, so an ingestion node needs no GPU of its own. A worker can also load a Hugging Face model on the node's own GPU, do CPU work such as rendering pages in a headless browser, or run vision models such as SAM3 and YOLO.

vLLM itself got here in steps. We started with batch generate inside the pipeline process, moved to vLLM's async engine for continuous batching, then found its outputs differed from vllm serve with the same arguments, so we now drive vllm serve over HTTP, and finally shared hosted servers. The lesson from that path: run the model the way vLLM itself serves it.

## 17. Part two · Crash safe
*2 · Crash safe · ~0.2 min · no steps*

Busy GPUs are only useful if the work survives. Part two is the core of the talk: how the engine stays crash safe: it loses nothing and repeats nothing, even when processes and machines die.

## 18. Nodes take work from one table
*2 · Crash safe · ~1.6 min · no steps*

Busy GPUs are only useful if the work survives, so start with how many nodes share one run, with as little overhead as possible. Nodes do not talk to each other and there is no coordinator. Each stage's queue is a table in the DB with one row per sample, drawn here as one box per image, and each row has a state: waiting, claimed, done or failed. A node that wants work sends the database one command that picks a few waiting rows, marks them as its own and writes its name on them, all in one step. A second node making the same request at the same instant skips those rows, so two nodes can never get the same image. Nothing is assigned in advance, so a fast node simply takes more work. Click the steps, or press next, to walk through one run.

**[step 1]** Nodes A and B each ask the queue for a batch of images. Each batch takes its node's colour, and the node works on it.

**[step 2]** Now node B crashes in the middle of its batch. Its images are marked as claimed by a node that no longer exists. Recovery hands them back to waiting, so nothing is lost.

**[step 3]** Node C arrives and claims exactly those images, and the run carries on as if nothing happened.

**[step 4]** Node D joins later. One image that cannot be read is marked failed without stopping the rest, and the table finishes with every image done once. To grow a run you start the same program on more nodes; to shrink it you stop some. The DB is deliberately one plain database on one machine, because every extra component is another way to fail.

## 19. Recovery and scaling without intervention
*2 · Crash safe · ~3.2 min · reveal steps: 8*

Back to the first two problems from the start: nodes die, and GPUs come and go. The run handles both without anyone stepping in: it recovers, and it scales. First, recovery.

**[step 1]** The idea is simple: each layer is restarted by the layer around it. Click any of the three cases on the right to play it. Inside one node, workers live inside a supervisor, the supervisor lives inside the program, and a small watcher script sits around the program. The vLLM server has its own watcher too.

**[step 2]** A worker dies. The supervisor notices and starts a new one in its place, and the requests that worker had are sent again.

**[step 3]** The whole program stops, or the node reboots. The watcher starts the program again. Whatever samples it had claimed and not finished go back to the table, and any node can pick them up.

**[step 4]** A vLLM server crashes. Its own watcher restarts it, and the requests that were waiting on it go back to the queue. In every case nobody is paged and no work is lost.

**[step 5]** Now scaling, in three steps. Step one: all the servers are up. The key decision: pipelines don't own models. The cluster runs model servers on every machine, and the pipeline just uses whichever are serving. We even launch the run before any server is up: it just waits. Every 30 seconds the run checks which servers are serving, and starts one worker per serving server. No restart, no configuration. Every worker fetches samples from the database and sends them to its server.

**[step 6]** Step two: a colleague borrows servers 3 and 4. Their workers do not die: they drain, sending the samples they had not finished back to the database, and then they wait. Everyone else carries on.

**[step 7]** Step three: the servers come back, and those workers start again and fetch from the database. Nothing was lost and nobody restarted anything. You can click the steps, pause, or drag the slider.

**[step 8]** Here is what that looks like over one day, as in our blog; the shape is illustrative. One: we launched before the models were up, and work started as each server came online. Two: a colleague borrowed GPUs; the workers using them drained and waited. Three: the test finished, and those workers fetched from the database again. Four: a server crashed; its requests went back and it restarted. Five: free GPUs appeared and the run spread onto them. Nobody touched the run all day.

## 20. Every error is followed through
*2 · Crash safe · ~1 min · no steps*

At production scale, something fails every minute, and every error has to be followed through to the end: no error is dropped, and none is left vague. To do that, every error is sorted, where it happens, into one of two kinds.

In the first kind, the sample itself is the problem: a corrupt image, an image too large for the model, a file that cannot be read, an answer that still does not parse after a retry with a stricter prompt. Retrying again would only waste time. So we discard it: mark it failed and record the reason.

In the second kind, the system or the infrastructure is at fault: a server crashed, a process ran out of memory or was killed, the network dropped, a server was put to sleep. The sample is fine, so it must never be marked failed. It is retried, on another node or at a later time. And if everything is failing at once, the run pauses instead of failing samples.

When it is unclear, treat it as the system's fault, because the two mistakes do not cost the same: a retry costs seconds, but a good sample thrown away is lost for good. The result is a dataset where every missing sample has a recorded reason, and none are missing because of an outage.

*If asked: a fuse stops the whole run, failing nothing, after max(2b, 64) consecutive infrastructure failures with no success; and a request that fails as infrastructure more than five times while others succeed is failed as itself. Before this classification existed, a dead backend marched whole datasets into the failed state.*

## 21. Part three · Graphs of stages
*3 · Graphs of stages · ~0.2 min · no steps*

Until now we treated a stage on its own. But a good training example is never the work of one model. Part three is how a page moves through many models, each page on its own path, and how the engine runs that across machines without a coordinator.

## 22. One pipeline, a different route for every page
*3 · Graphs of stages · ~1.2 min · no steps*

Here is the problem part three solves. A good training example is never the output of a single model. Six pages enter the same pipeline of seventeen agents. Understand reads each page and decides where it goes next, and later agents keep deciding too.

A chart is read, then re-read by a second model to catch wrong numbers. A table is rebuilt as HTML and rendered in a browser to check it matches. A form has one field hidden, so the questions test whether the model notices it is missing. A text page goes through key-fact extraction, and if Verify rejects the answer a larger teacher model writes the final one. A scan is straightened first, then handled like any text page. A blank page is dropped straight away, so no expensive stage runs on it.

All six run together, each on its own route. You can click any page to replay just its route; the line at the bottom shows the route it took, which every output records.

## 23. The whole pipeline is a graph
*3 · Graphs of stages · ~2 min · reveal steps: 4*

Put all those routes together and you get one graph. A page enters at the left. Each box is a model, a tool or a check. Three rules decide where a page goes and when a box may start, and we will zoom into each.

**[step 1]** One: routing. After Understand finishes a page, a small function written by the pipeline author looks at what it found and picks the next box for that page. A chart goes to the chart reader, a table to the table reader, a formula to the LaTeX writer. A text page goes to two boxes at once, transcription and layout. It can also pick none: a blank page simply stops.

**[step 2]** Two: needs both. Some boxes need several inputs. Grounded question answering needs both the transcribed text and the layout of the same page. Watch the label: the text arrives first, so it keeps waiting for the layout. When the layout arrives, it starts, exactly once. It does not matter which finished first or on which machine. Solid lines mean every input is needed.

**[step 3]** Three: either one is enough. Write a question takes a table or a chart. A page is never both, so the table reader's input will never come for a chart page; waiting for both would wait forever. So it starts as soon as one input is done. Dotted lines mean one input is enough.

**[step 4]** Three rules: route the page, needs every input, one input is enough. Every pipeline we run is built from these.

## 24. A dynamic DAG fits our workloads
*3 · Graphs of stages · ~0.8 min · reveal steps: 1*

Look at the pipelines we build. Every one of them has three things. It is a graph, declared once in code: each stage names its inputs, and the engine works out who feeds whom. Acyclic: no loops. Verification loops are common, but a cycle makes it impossible to say when a sample is finished, so a retry is a bounded decision inside a routing function, with a counter so it cannot go on forever. And dynamic: the graph is fixed, but each sample's route through it is decided while it runs, from what earlier stages found.

**[step 1]** Put the three together and you get the conclusion: a dynamic directed acyclic graph fits almost every workload we have. Straight chains, branches by content, merges and early exits are all special cases of that one shape, so the engine only has to run one thing well.

## 25. From idea to a running pipeline
*3 · Graphs of stages · ~0.8 min · reveal steps: 3*

So a DAG can describe almost any workload we have. And once you define it, running it is very simple. Two parts, then one command.

**[step 1]** Part one: you define the DAG. What the stages are, and which ones feed which.

**[step 2]** Part two: you define what each stage does: the prompt, and what a good answer looks like.

**[step 3]** And you run one command on every machine. After anything goes wrong, you run the same command again. There is no step for recovery, retries, coordination or scaling, because those were designed once and every pipeline shares them. The same engine has run transcription, HTML conversion, chart reading, question answering and dozens of other pipelines. And once the DAG is defined, the engine runs all of its stages in parallel. Here is what that buys.

## 26. All stages at once
*3 · Graphs of stages · ~1.2 min · no steps*

Once the DAG is defined, the engine runs all of its stages at the same time, automatically. Why does that matter? The obvious way is one stage at a time: run stage one over everything, wait, check, then launch stage two. It is simple and it is how most groups start. We did too. This is the same work on the same hardware, twice. Press play, or drag the slider to stop both runs anywhere.

Watch the big number on each side. On top, stage by stage: nothing usable exists until the last stage begins, and a person has to notice each stage finish and launch the next, for days. Below, every stage running at once: each record moves on as soon as it is saved, so finished examples start arriving almost immediately. Both runs finish at the same moment, because they do the same work. What changes is when usable results arrive.

If asked for a measured number: in the paper, a four-stage pipeline over 10 to the 5 pages on 16 emulated nodes produced its first thousand usable records after 10.7 minutes, against 81 minutes stage by stage. The counters on the slide are a simulation of a million examples.

## 27. What Patram-Ingest supports
*3 · Graphs of stages · ~0.6 min · no steps*

Putting it together, this is what the graph layer of Patram-Ingest supports; the cards appear on their own. A graph is a list of stage declarations: each stage names its upstream stages, a policy for waiting on them, and optionally a routing function. Stage authors never see the graph.

It supports any graph shape, declared in a few lines of code: straight chains, fan-out where one stage feeds many, and per-sample routing, where a routing function inspects what a stage produced and returns the stages to send each sample to.

Fan-in with two policies: a stage can need every input, or start as soon as one arrives.

Failure propagation: if a stage fails a sample, every later stage marks it upstream-failed when it next looks, so no stage waits forever for an input that will never arrive; resetting a derived upstream-failed is always safe, which makes fix-and-rerun possible.

Validation at start-up: acyclicity, reachability, routing-target isolation and the split between the two activation paths. And every output records the stages its sample passed through, so any record can be traced through the graph. Bit positions are stored in 64-bit integers; a wider bit string would serve any number of stages. Graphs are acyclic.

## 28. Scaling compared with DBOS and Temporal
*3 · Graphs of stages · ~1.5 min · no steps*

Very few alternatives come close to these features. Among the 13 systems in our comparison, only DBOS and Temporal do: they already survive crashes, route per sample and run across machines. So we ran the same pipeline on both, on the same DB server and the same emulated model servers. We made the servers answer in 20 milliseconds, so inference could not be the limit, and added nodes until throughput stopped growing.

DBOS gained nothing from nodes past 16: about 1,350 pages per second at 16 nodes and at 40. Temporal peaked at 546 on 4 nodes and stayed between roughly 260 and 390 from 8 to 32. In both, the database's replication path was saturated: most DBOS backends were waiting inside a commit for the standby.

Ours kept growing with every added node, to 8,571 pages per second at 32 nodes, which is 6 times DBOS and 28 times Temporal, with the database mostly idle. Why: the database only holds state, a few small rows per page, written in the background in groups; the results themselves go to files on each node, and no node ever waits on another. A driver replaying our statements with no model calls reached over 13,000 pages per second, so the database could give more.

And the overhead stays tiny as nodes are added. Against a bare client that reads prompts from a file and writes answers to local disk, with no database at all, we reach 98.9 to 99.7 percent of its throughput at every scale from 1 to 48 nodes. Throughput grew from 3.88 requests per second on one node to 183.6 on 48, which is 98.6 percent of linear. Caveat: this is one deployment of each system, each configuration ran once, and the servers were emulated.

## 29. Key takeaways
*Wrap-up · ~1 min · no steps*

If you take six things away from this talk, these are the lessons we learned the hard way.

One: expect failure; it is not an anomaly. Over weeks on a shared cluster, every step will at some point crash in the middle, so design every step for that, instead of treating it as a rare exception.

Two: single responsibility. Every component does exactly one job. A stage only transforms a sample: it does not know the graph, retry, coordinate or scale. Those live once in the engine, which is why a new pipeline is a few lines of code, and why a bug in one stage cannot break recovery.

Three: follow every error through to the end. Every error lands somewhere definite: a system problem is retried, a bad sample is set aside with its reason, and if you cannot tell which, you retry, because a retry costs seconds and a good sample thrown away is gone. Nothing is left stuck in between.

Four: no indefinite waits. A process that is killed while holding a shared lock never releases it, and every other worker blocks on it for good. So nothing that needs a lock is shared between workers that can die: each worker gets its own private inbox, and no process can end up stuck waiting on one that is gone.

Five: match the parallelism to the job. Processes for computing, threads for waiting, event loops for many calls at once.

Six: keep the database light. It holds only state; the results go to files on each node, written in groups, off the GPU's path. That is why the system keeps scaling as nodes are added.

## 30. The DB is the single source of truth
*Wrap-up · ~0.8 min · no steps*

If you remember one thing from this talk, make it this. Nowhere in the whole system, in the stage workers, the worker pools, the supervisors, the watchers, the model servers or the nodes, do we keep any state. Every one of them is stateless. The entire state of the run, what is waiting, claimed, done or failed, lives in one place: the DB. It is the single source of truth. Results go to files, and the DB says which ones count.

That one decision is where the distributed-system guarantees come from. Any component can crash and restart at any moment, like the stage worker here, and we survive it, because it held nothing: it simply reads the DB and carries on. Nodes can join or leave at any time, because there is nothing to hand over. And recovery is just a query on the DB, not a procedure someone has to run.

## 31. Where Patram-Ingest sits in the stack
*Wrap-up · ~1.2 min · reveal steps: 2*

To step back: Patram-Ingest, everything we talked about today, is just one part of the infrastructure we have.

**[step 1]** There is a lot supporting it from below: our storage layer, Patram-FS and Patram-DB, the scraper and our synthetic documents that bring raw data in, and DarshinAI for annotation and visualization.

**[step 2]** And above it, Patram-Core takes this data, our training corpus, and makes it possible to train models. Using all of this, we have trained many foundation models, the Patram Suite, and evaluated them on our own benchmarks. These are internal models as of now; we plan to release the Patram series soon, and the sign-up form is on the next slide.

## 32. Thank you
*4 · Thank you · ~0.6 min · no steps*

To bring it together: you describe the pipeline, and the engine keeps it busy, crash-safe and scalable, for weeks at a time, on a cluster where nodes die and GPUs come and go. Thank you. There are two codes on the right: the first is the sign-up form for the Patram series, so we can let you know when it is released, and the second is our hiring form. Scan whichever is useful. If there is time, we have two questions for the room and one problem to take home, and we are happy to take yours.

**Likely questions.** Why not Kafka or Redis? Every extra component is a new way to fail, and the database costs a small fraction of runtime. What if the DB dies? Results on disk stay safe because saving comes first; with a managed high-availability DB a failover takes about 20 seconds and workers reconnect within a 30-second budget; if the database stays down longer the run aborts and nodes reclaim their rows at next start. Why not per-sample fsync? It is slow on a network filesystem, and the commit group bounds the redo. What about step-level durability? Use DBOS or Temporal for that; our bound is the commit group. Who decides to add nodes? Today a person or a script starts the program on a node; the run then uses it without any other change. A scheduler that decides on its own is the next step.

## 33. Part five · Q&amp;A (optional)
*5 · Q&amp;A · ~0.2 min · no steps*

Part five is over to you. We have two questions for the room, one to take home, and then we are happy to take yours.

## 34. The remaining question (optional)
*5 · Q&amp;A · ~0.4 min · no steps*

One question remains. How exactly do we run graphs across nodes, with every stage running at once, and still keep the distributed guarantees: never losing a page and never doing one twice, through any crash? Rather than show you the whole design, we work out two of the pieces with you, and leave the full design as a take-home problem.

## 35. Question 1: which order survives the crash? (optional)
*5 · Q&amp;A · ~1.2 min · reveal steps: 2*

A small warm-up. When Stage 1 finishes a page it makes two writes to the DB: mark Stage 1 done, and mark Stage 2 ready. The machine can crash between the two writes. Remember the recovery rule from part two: after a restart, any page that is not marked done is picked up and run again.

**[step 1]** So: which order survives the crash? Hands up for A: mark Stage 1 done first. Hands up for B: mark Stage 2 ready first.

**[step 2]** Look at what the DB says after the crash. In A, Stage 1 is done and Stage 2 has nothing, so nobody picks the page up again, and Stage 2 never hears about it: the page is lost. In B, Stage 1 is not done and Stage 2 is ready, so Stage 1 runs the page again and marks Stage 2 ready again, and ready twice is still just ready. So the rule is: hand the page on first, mark yourself done last, and make every write safe to repeat.

## 36. Question 2: who decides that Grounded Q&amp;A can start? (optional)
*5 · Q&amp;A · ~1.3 min · reveal steps: 2*

Now a design question. One page. Its text was transcribed on machine 3 at 10:02. Its layout was found on machine 7 at 10:05. Grounded Q&A needs both. Three facts: the two machines never talk to each other; any machine can crash at any moment; and Grounded Q&A must start exactly once, not zero times, which loses the page, and not twice, which makes a duplicate. So: who decides that it can start?

**[step 1]** Three options. A: a new central tracking service, a separate program that remembers every page. B: the machines send each other messages. C: each machine writes down what it finished in the database we already have, and a small check reads it. Which would you pick? Hands up for A, B or C.

**[step 2]** A is the usual first answer, but that service has to keep its memory somewhere durable, and that somewhere is a database. So A is really C plus one more process to keep alive on a cluster where processes die. B breaks when a crash loses a message or a retry repeats one. C is what we do: we already have a database that holds every sample and survives crashes, so we add nothing new. Same rule as before: the DB is the single source of truth, and nothing that matters lives in a process.

## 37. Take-home: how should the database coordinate the stages? (optional)
*5 · Q&amp;A · ~0.6 min · reveal steps: 1*

So the two pieces are in place: each machine writes what it finished into the database, and the writes are ordered so they are safe to repeat. What remains is the full design: how the database turns those notes into Grounded Q&A starting exactly once, through a crash at any moment, with no messages between machines, and still fast at 32 nodes. That is a talk of its own.

**[step 1]** So we leave it with you as a take-home problem. Tell us how you would solve it, here or afterwards. We will compare your ideas with what we built, and we are happy to talk it through.
