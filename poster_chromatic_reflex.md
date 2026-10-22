# INNOVATION GARAGE · NIT WARANGAL
## CHROMATIC REFLEX
### Real-Time Vision & Spatial Hand Kinematics Interactive Reflex Engine

---

### 01 — HOW DOES IT WORK?
**Follow the complete journey from input to output.**

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    01 INPUT     │  ──▶  │   02 PROCESS    │  ──▶  │   03 AI / ML    │  ──▶  │   04 DECISION   │  ──▶  │    05 OUTPUT    │
│  60 FPS Webcam  │       │ MediaPipe GPU   │       │ 3D Kinematics   │       │ Hysteresis &    │       │ 4-Color Reflex  │
│  RGB Frame Feed │       │ 21-Joint Mesh   │       │ Extension Math  │       │ Multi-Frame N   │       │ Game & Audio    │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

#### [01] INPUT — Raw Data
- **High-Frequency Video Stream (640×480 @ 60 FPS)**: Directly streams camera frames via HTML5 WebRTC using `requestVideoFrameCallback` for frame-accurate display timestamps (`performance.now()`).
- **Dynamic Viewport Aspect Normalization**: Computes aspect ratio ($\text{width} / \text{height}$) on every frame to normalize coordinates and eliminate wide-angle lens distortion.

#### [02] PROCESS — Prepare Data
- **MediaPipe HandLandmarker (GPU Delegate)**: Ingests normalized video frames through an accelerated `float16` neural model running client-side on WebGL/WASM.
- **21 3D Spatial Landmarks**: Detects hand presence and regresses 21 key skeletal joints $(x, y, z)$ spanning wrist, MCP knuckles, PIP, DIP, and fingertips in sub-10ms.
- **Z-Axis Depth Tracking**: Tracks relative depth coordinate $z$ to preserve spatial geometric integrity when the hand rotates or tilts.

#### [03] AI / ML — Recognize Patterns
- **Z-Aware 3D Euclidean Distance ($d_3$)**: Computes true 3D spatial distances factoring in aspect ratio and depth:
  $$d_3(A, B) = \sqrt{\big((x_A - x_B) \cdot \text{Aspect}\big)^2 + (y_A - y_B)^2 + \big((z_A - z_B) \cdot \text{Aspect}\big)^2}$$
- **Normalized Radial Extension Ratios**: Measures finger curl/extension via:
  $$\text{Ratio}_i = \frac{d_3(\text{Wrist}, \text{Tip}_i)}{d_3(\text{Wrist}, \text{MCP}_i)}$$
  mapping fingers to curled ($\le 1.10$) or fully extended ($\ge 1.80$).
- **Vectorized Thumb Kinematics**: Computes palm-normalized thumb reach ($\frac{d_2(\text{Tip}, \text{MCP})}{\text{Palm}}$) and vertical unit direction ($\text{dir} = \frac{-v_y}{\sqrt{v_x^2 + v_y^2}}$) to isolate unambiguous thumbs-up gestures.

#### [04] DECISION — Interpret Result
- **Dual-Threshold Hysteresis State Machine**: Decouples "Enter" vs "Stay" criteria (`[0.75, 0.60]` for reach; `[0.55, 0.35]` for verticality) with a 1.10× extension scale, completely eliminating boundary flickering.
- **Multi-Frame Temporal Confirmation ($N = 5$)**: Enforces consecutive frame stability above 65% confidence (`CONF_THRESH = 0.65`) before locking a gesture transition, suppressing camera noise and rapid hand transitions.

#### [05] OUTPUT — Final Action
- **4-Color Chromatic Reflex Game Loop**: Maps classified gestures directly to stimulus visual prompts:
  - 🔴 **RED** $\longrightarrow$ `two_fingers` (Peace / V-Sign)
  - 🔵 **BLUE** $\longrightarrow$ `fist` (Curled Fist)
  - 🟡 **YELLOW** $\longrightarrow$ `thumbs_up` (Vertical Thumb)
  - 🟢 **GREEN** $\longrightarrow$ `point` (Index Finger Extended)
- **Millisecond Telemetry & Audio Feedback**: Measures player reaction time ($t - t_0$ via `performance.now()`), accelerates round difficulty (2800ms $\to$ 1500ms), triggers WebAudio synthesizers, and uploads streak statistics to the backend leaderboard.

---

### 02 — THE ML BEHIND IT

#### 🖐️ Concept 1: MediaPipe Hands (BlazePalm + 3D Mesh Regression)
- **What it does & why it's used**: Standard convolutional neural networks performing pixel-level segmentation are far too heavy for interactive 60 FPS web gameplay. MediaPipe splits detection into two stages: BlazePalm detects palm envelopes, and the Landmark network predicts 21 3D coordinates.
- **Why it matters**: Executes entirely on-device using client GPU delegates, ensuring zero network latency, strict user privacy, and fluid 60 FPS interactive responsiveness.

#### 📐 Concept 2: Z-Aware 3D Euclidean Spatial Kinematics
- **How the model learns or reasons**: Camera webcams capture 2D planar projections. If a player tilts their hand forward, 2D distance between wrist and fingertips artificially shrinks, causing false curl detections.
- **The Mathematical Solution**: The pipeline integrates relative depth coordinate $z$:
  $$d_3 = \sqrt{(\Delta x \cdot \text{Aspect})^2 + \Delta y^2 + (\Delta z \cdot \text{Aspect})^2}$$
  Normalizing by MCP knuckle distance makes finger extension ratios completely invariant to distance from the lens, pitch, and yaw.

#### 🔄 Concept 3: Hysteresis State Machine & Multi-Frame Debouncing
- **How the result is generated**: When a user holds a hand near the decision boundary, noisy frame-by-frame confidence causes rapid state flickering. The engine solves this via:
  - **Asymmetric Hysteresis:** Entering thumbs-up requires strict verticality ($>0.55$) and high reach ($>0.75$); maintaining it relaxes to $>0.35$ and $>0.60$.
  - **Rolling Temporal Window:** Requires $N = 5$ consecutive agreeing frames at $\ge 65\%$ confidence, ensuring rock-solid game inputs without missed reflex triggers.

---

### AI UNVEILED · SEE THE MODEL. UNDERSTAND THE MAGIC.
