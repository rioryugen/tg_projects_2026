# HF Daily Papers — local corpus

Built by `node ingest.mjs` from `https://huggingface.co/api/daily_papers?date=YYYY-MM-DD`.

- `papers.jsonl` — normalized corpus (one JSON object per paper), rebuilt from all stored days.
- `data/daily/<date>.json` — raw API response per day, kept verbatim as the source of truth.

Run: `node ingest.mjs 2026-11-13 2026-11-12` (no args = last 14 days ending today).
Re-running is safe: existing days are skipped, the corpus is rebuilt from disk.

## Top papers by upvotes (364 papers, 14 days)

| Title | ▲ | Day | arXiv |
| --- | --- | --- | --- |
| [Advances in Agentic Computer Graphics](https://huggingface.co/papers/2611.01860) | 150 | 2026-11-03 | 2611.01860 |
| [Wave Forcing: Towards Speed-of-Light Streaming Video Generation](https://huggingface.co/papers/2611.00859) | 128 | 2026-11-03 | 2611.00859 |
| [VFlash: Fast, Accurate Visual Planning via Flash Primitive Decoding](https://huggingface.co/papers/2611.08449) | 117 | 2026-11-06 | 2611.08449 |
| [From Autonomous Agents to Cognitive Symbionts: Toward AI-Augmented Human Intelligence](https://huggingface.co/papers/2611.05376) | 105 | 2026-11-06 | 2611.05376 |
| [Learning Heterogeneous Tactile Representation for General Dexterous Manipulation](https://huggingface.co/papers/2611.12806) | 102 | 2026-11-10 | 2611.12806 |
| [CoworkOS:Scaling Agent Coworkers for Real-world Automation](https://huggingface.co/papers/2611.03178) | 100 | 2026-11-03 | 2611.03178 |
| [Confucius4-R2T2: A Stable-Prefix Streaming ASR Model for Real Real-Time Transcription](https://huggingface.co/papers/2611.06043) | 92 | 2026-11-09 | 2611.06043 |
| [Few-Step Streaming Video Generation via Condition Shifting](https://huggingface.co/papers/2611.14033) | 89 | 2026-11-11 | 2611.14033 |
| [SLA: Scaling Spatial-Language-Action Model via Continual Pre-training](https://huggingface.co/papers/2611.08373) | 88 | 2026-11-06 | 2611.08373 |
| [Behind Video Generation: Observations and Insights on Multimodal Understanding from Kling](https://huggingface.co/papers/2611.04916) | 83 | 2026-11-04 | 2611.04916 |
| [Route Anything: A Study of Model and Policy Routing for General-Purpose AI Systems](https://huggingface.co/papers/2611.05275) | 82 | 2026-11-04 | 2611.05275 |
| [Words Caught in the Heart: Simulating Person-Specific Expression for Self-Opaque Clients in Psychotherapy](https://huggingface.co/papers/2611.00617) | 78 | 2026-11-04 | 2611.00617 |
| [Video Generation Meets Agent Harness: Agentic Video Generation, Agentic World Modeling and Recursive Self-Improvement](https://huggingface.co/papers/2610.40191) | 76 | 2026-11-03 | 2610.40191 |
| [MoviEdit: Long-form Multi-Shot Video Editing Made Easy](https://huggingface.co/papers/2611.02737) | 76 | 2026-11-04 | 2611.02737 |
| [SO-Arena: Benchmarking the Capability Spectrum and Reliability of System One Models](https://huggingface.co/papers/2611.15777) | 72 | 2026-11-13 | 2611.15777 |
| [Harness-S: Learning from Sibling Harnesses for Generalizable Agent Training](https://huggingface.co/papers/2611.04277) | 70 | 2026-11-06 | 2611.04277 |
| [P^2-MOPD: Accelerating Multi-Teacher On-Policy Distillation via Parameter Priors](https://huggingface.co/papers/2611.03953) | 69 | 2026-11-09 | 2611.03953 |
| [SplatAnything: Gaussian Spacing Normalization for Feed-forward 3DGS across Arbitrary Scenes](https://huggingface.co/papers/2611.08264) | 69 | 2026-11-09 | 2611.08264 |
| [Does Scaling Toward AGI Depend on What System-1 Lets System-2 Execute?](https://huggingface.co/papers/2610.39497) | 66 | 2026-11-02 | 2610.39497 |
| [Think Less, Locally: Local Preference Learning for Reasoning Compression](https://huggingface.co/papers/2611.04814) | 66 | 2026-11-04 | 2611.04814 |
| [Tree-Ising: Repairing Language Models with Bit-Level Ising Edits](https://huggingface.co/papers/2611.14210) | 66 | 2026-11-11 | 2611.14210 |
| [Don't Just Trust Your Memory: Evidence-Linked Memory Reduces Memory-Induced Degradation in LLM Agents](https://huggingface.co/papers/2611.14320) | 65 | 2026-11-11 | 2611.14320 |
| [FrontierPhysics: Evaluating Agents for End-to-End Physics Research](https://huggingface.co/papers/2611.06910) | 62 | 2026-11-05 | 2611.06910 |
| [From Pixels to Actions - Towards Native Vision-Language-Action Policies](https://huggingface.co/papers/2611.06918) | 60 | 2026-11-05 | 2611.06918 |
| [WorldFoundry: Towards Unified Infrastructure for World Intelligence](https://huggingface.co/papers/2611.10771) | 58 | 2026-11-10 | 2611.10771 |
| [World In-Context Learning for Agentic Robot Manipulation](https://huggingface.co/papers/2611.12885) | 58 | 2026-11-11 | 2611.12885 |
| [Sage-Taiyi: A Metacognitive Architecture for Scientific Discovery](https://huggingface.co/papers/2611.12762) | 57 | 2026-11-10 | 2611.12762 |
| [DreamX: Video Diffusion Model is a Universal Latent Action Learner](https://huggingface.co/papers/2611.05377) | 56 | 2026-11-04 | 2611.05377 |
| [Random Is Almost Enough? Stable and Low-Cost Benchmark Compression via BestRand](https://huggingface.co/papers/2611.00883) | 53 | 2026-11-06 | 2611.00883 |
| [Toward the Era of Agentic Embodied Intelligence](https://huggingface.co/papers/2611.09124) | 53 | 2026-11-09 | 2611.09124 |
| [RoboColosseum: Evaluating Physical Intelligence at Scale In-The-Wild](https://huggingface.co/papers/2611.02497) | 51 | 2026-11-04 | 2611.02497 |
| [CUA-Master: Scaling Computer-use Agents through Open-World Recursive Improvements](https://huggingface.co/papers/2611.03126) | 50 | 2026-11-03 | 2611.03126 |
| [Axion 1.0: Open Agent Foundation Models, Simplified](https://huggingface.co/papers/2611.03233) | 50 | 2026-11-04 | 2611.03233 |
| [Democratizing Robot-Use Agents: A Unified Harness with Open Models](https://huggingface.co/papers/2611.01560) | 49 | 2026-11-03 | 2611.01560 |
| [R^2Orch: Recursive Self-Improvement for Agent Orchestration via Self-Play within a Skill-Internalization Loop](https://huggingface.co/papers/2610.22740) | 48 | 2026-11-02 | 2610.22740 |
| [IdeaTaste: Do LLMs Share the Research Taste of Human Researchers?](https://huggingface.co/papers/2611.03424) | 47 | 2026-11-03 | 2611.03424 |
| [Factorized MLLM Embeddings for Composed Image Retrieval](https://huggingface.co/papers/2611.05193) | 47 | 2026-11-04 | 2611.05193 |
| [WeLM-Image: A Unified Image Generation Model towards Visual Intelligence](https://huggingface.co/papers/2611.07392) | 47 | 2026-11-06 | 2611.07392 |
| [Latent Reasoning in Continuous Space for Unified Multimodal Models](https://huggingface.co/papers/2610.42149) | 44 | 2026-11-02 | 2610.42149 |
| [TailSteer: Trajectory-Tail Steering for Drift-Resistant Multi-turn Image Editing](https://huggingface.co/papers/2611.06741) | 44 | 2026-11-06 | 2611.06741 |
