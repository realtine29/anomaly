import cv2
import numpy as np
import time
import threading
import os
import sys
import json
from collections import deque
from flask import Flask, Response
from flask_cors import CORS
from ultralytics import YOLO
from tensorflow.keras.models import load_model

# ==========================================
#  1. CONFIGURATION & CONSTANTS
# ==========================================
# Camera Settings
RTSP_URL = "rtsp://TC200C:CAMERA-TC200C@192.168.100.102:554/stream1"
CAMERA_NAME = "Tapo_TC200C"

# Model Paths
ANOMALY_MODEL_PATH = 'anomaly_detector.keras'
STEALING_MODEL_PATH = 'stealing_classifier.keras'
YOLO_MODEL = 'yolov8n-pose.pt'

# Directories
LOG_FILE = "ai_model/detections_log.json"
OUTPUT_DIR = "ai_model/detections"

# --- Detection Thresholds ---
POSE_THRESHOLD = 0.25               # Sensitivity for "fighting/falling"
STEALING_MIN_MOTION_ERROR = 0.08    # Low value to detect smooth stealing
STEAL_THRESH = 0.85                 # Confidence required for stealing classifier

# --- Behavior Logic Config ---
HISTORY_SECONDS = 30                # How long we remember movement
FPS_ESTIMATE = 15
HISTORY_LEN = HISTORY_SECONDS * FPS_ESTIMATE

SCAN_WINDOW_SEC = 4                 # Time window to complete a "scan"
SCAN_LEN = SCAN_WINDOW_SEC * FPS_ESTIMATE

STILLNESS_TRIGGER_SEC = 4           # Seconds of stillness before "Loitering"
STILLNESS_LIMIT = STILLNESS_TRIGGER_SEC * FPS_ESTIMATE

ALERT_MAX_DURATION = 10.0           # Max time an alert stays on screen
ROUTINE_COOLDOWN = 30.0             # Cooldown period after max duration

# ==========================================
#  2. INITIALIZATION
# ==========================================
app = Flask(__name__)
CORS(app)

print(">> Loading AI Models...")
try:
    lstm_model = load_model(ANOMALY_MODEL_PATH)
    yolo_model = YOLO(YOLO_MODEL)
    print(">> models loaded successfully.")
   
    if os.path.exists(STEALING_MODEL_PATH):
        stealing_model = load_model(STEALING_MODEL_PATH)
    else:
        stealing_model = None
        print("!! Warning: Stealing model not found.")
except Exception as e:
    print(f"!! Critical Error loading models: {e}")
    sys.exit(1)

# ==========================================
#  3. VIDEO STREAM CLASS
# ==========================================
class RTSPVideoStream:
    """Reads video frames in a separate thread to prevent blocking."""
    def __init__(self, src):
        self.cap = cv2.VideoCapture(src)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.ret, self.frame = self.cap.read()
        self.stopped = False
        threading.Thread(target=self.update, daemon=True).start()
   
    def update(self):
        while not self.stopped:
            ret, frame = self.cap.read()
            if ret:
                self.ret, self.frame = ret, frame
            else:
                time.sleep(0.01) # Prevent CPU spin if stream drops
   
    def read(self):
        return self.ret, self.frame
   
    def stop(self):
        self.stopped = True
        self.cap.release()

cap = RTSPVideoStream(RTSP_URL)

# ==========================================
#  4. HELPER FUNCTIONS
# ==========================================
def get_centroid(kpts):
    """Returns the center (x, y) of the person based on keypoints."""
    xs = kpts[0::2]
    ys = kpts[1::2]
    return np.mean(xs), np.mean(ys)

def check_head_scanning(kpts, scan_history):
    """Detects left-to-right head scanning."""
    nose_x = kpts[0]
    left_sh_x = kpts[5*2]
    right_sh_x = kpts[6*2]
    shoulder_width = abs(right_sh_x - left_sh_x)
   
    if shoulder_width < 0.01: return False
   
    # Calculate nose position relative to shoulders (0.0 = Left, 1.0 = Right)
    look_ratio = (nose_x - left_sh_x) / shoulder_width

    if look_ratio < 0.15: scan_history.append("LEFT")
    elif look_ratio > 0.85: scan_history.append("RIGHT")
    else: scan_history.append("CENTER")

    # Trigger if both LEFT and RIGHT movements exist in history
    return "LEFT" in scan_history and "RIGHT" in scan_history

def is_hand_near_face(kpts, height_px):
    """Returns True if hands are near face (grooming/eating filter)."""
    nose_x, nose_y = kpts[0], kpts[1]
    lw_x, lw_y = kpts[18], kpts[19]
    rw_x, rw_y = kpts[20], kpts[21]
   
    dist_l = np.hypot(lw_x - nose_x, lw_y - nose_y) * height_px
    dist_r = np.hypot(rw_x - nose_x, rw_y - nose_y) * height_px
   
    threshold = height_px * 0.15
    return dist_l < threshold or dist_r < threshold

def get_stealing_speed(pose_sequence, width, height, person_height_px):
    """Estimates speed of hand movement for stealing classification."""
    if len(pose_sequence) < 5: return "SLOW (PICK)"
   
    recent_seq = pose_sequence[-15:]
    max_speed_px = 0.0
   
    for i in range(1, len(recent_seq)):
        prev = recent_seq[i-1]
        curr = recent_seq[i]
        lw_dist = np.hypot((curr[18]-prev[18])*width, (curr[19]-prev[19])*height)
        rw_dist = np.hypot((curr[20]-prev[20])*width, (curr[21]-prev[21])*height)
        max_speed_px = max(max_speed_px, lw_dist, rw_dist)
   
    threshold = person_height_px * 0.10
    return "FAST (SNATCH)" if max_speed_px > threshold else "SLOW (PICK)"

def save_alert_clip(frame_buffer, label):
    """Saves the video clip and logs the alert."""
    try:
        safe_label = label.replace(":", "").replace(" ", "_")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{OUTPUT_DIR}/{CAMERA_NAME}_{safe_label}_{timestamp}.mp4"
       
        # Log to JSON
        entry = {"camera": CAMERA_NAME, "timestamp": timestamp, "type": label, "file": filename}
        current_logs = []
        if os.path.exists(LOG_FILE):
            try:
                with open(LOG_FILE, 'r') as f: current_logs = json.load(f)
            except: pass
        current_logs.append(entry)
        with open(LOG_FILE, 'w') as f: json.dump(current_logs, f, indent=2)
       
        # Save Video
        if len(frame_buffer) > 0:
            h, w, _ = frame_buffer[0].shape
            out = cv2.VideoWriter(filename, cv2.VideoWriter_fourcc(*'mp4v'), 15, (w, h))
            for f in frame_buffer: out.write(f)
            out.release()
            print(f"   [Saved] {filename}")
    except Exception as e:
        print(f"!! Error saving clip: {e}")


# ==========================================
#  5. MAIN LOGIC LOOP
# ==========================================
people_states = {}

def gen_frames():
    frame_buffer = deque(maxlen=150)
    frame_count = 0
    LOGIC_SKIP = 3
   
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue

        frame = cv2.resize(frame, (640, 360))
        height, width, _ = frame.shape
        frame_buffer.append(frame.copy())
        frame_count += 1
       
        # --- 1. YOLO TRACKING ---
        results = yolo_model.track(frame, persist=True, verbose=False, classes=[0], conf=0.5)
       
        if results is not None and results[0].boxes is not None and results[0].keypoints is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id
            keypoints = results[0].keypoints.xyn.cpu().numpy()
           
            if track_ids is not None:
                track_ids = track_ids.int().cpu().tolist()
               
                for box, track_id, kpts in zip(boxes, track_ids, keypoints):
                    kpts_flat = kpts.flatten()
                   
                    if track_id not in people_states:
                        people_states[track_id] = {
                            'pose_seq': [],
                            'loc_hist': deque(maxlen=HISTORY_LEN),
                            'scan_hist': deque(maxlen=SCAN_LEN),
                            'stationary_counter': 0,
                            'alert_start_time': 0,
                            'last_cooldown_time': 0,
                            'current_label': "Normal",
                            'current_color': (0, 255, 0),
                            'debug_info': ""
                        }
                   
                    person = people_states[track_id]
                   
                    # --- 2. LOCATION UPDATES ---
                    cx_norm, cy_norm = get_centroid(kpts_flat)
                    cx, cy = int(cx_norm * width), int(cy_norm * height)
                   
                    dist_speed = 0.0
                    if len(person['loc_hist']) > 0:
                        lx, ly = person['loc_hist'][-1]
                        dist_speed = np.hypot(cx-lx, cy-ly)
                        if dist_speed > 2: person['loc_hist'].append((cx, cy))
                       
                        if dist_speed < 5.0: person['stationary_counter'] += 1
                        else: person['stationary_counter'] = 0
                    else:
                        person['loc_hist'].append((cx, cy))

                    # --- 3. BEHAVIOR ANALYSIS ---
                    if frame_count % LOGIC_SKIP == 0:
                        now = time.time()
                       
                        if now - person.get('last_cooldown_time', 0) < ROUTINE_COOLDOWN:
                            person['current_label'] = "Normal"
                            person['current_color'] = (0, 255, 0)
                       
                        else:
                            # Metrics
                            nose_y = kpts_flat[1]
                            feet_y = max(kpts_flat[15*2 + 1], kpts_flat[16*2 + 1])
                            h_px = max(abs(feet_y - nose_y) * height, 100)
                           
                            # TUNING: Pacing lowered to 5x height (Easier to trigger)
                            PACING_DIST_REQ = h_px * 5.0  
                            SWAY_BOX = h_px * 0.5
                            AREA_BOX = h_px * 1.5

                            # Pose
                            person['pose_seq'].append(kpts_flat)
                            person['pose_seq'] = person['pose_seq'][-30:]
                           
                            lstm_err, steal_prob = 0.0, 0.0
                            if len(person['pose_seq']) == 30:
                                inp = np.array([person['pose_seq']])
                                recon = lstm_model.predict(inp, verbose=0)
                                lstm_err = np.mean(np.abs(recon - inp))
                                if stealing_model:
                                    steal_prob = stealing_model.predict(inp, verbose=0)[0][0]

                            # --- C. Pacing Logic ---
                            total_dist, pacing_ratio = 0, 0.0
                            is_pacing = False
                           
                            if len(person['loc_hist']) > (HISTORY_LEN // 2):
                                xs = [p[0] for p in person['loc_hist']]
                                ys = [p[1] for p in person['loc_hist']]
                                box_w = max(xs) - min(xs)
                                box_h = max(ys) - min(ys)
                                box_diag = np.hypot(box_w, box_h)
                               
                                for i in range(1, len(person['loc_hist'])):
                                    step = np.linalg.norm(np.array(person['loc_hist'][i]) - np.array(person['loc_hist'][i-1]))
                                    if step > 2.0: total_dist += step
                               
                                if box_diag > 0: pacing_ratio = total_dist / box_diag
                               
                                # Pacing Trigger
                                if total_dist > PACING_DIST_REQ and pacing_ratio > 1.5 and dist_speed > 2.0:
                                    is_pacing = True

                            # --- D. Decision Tree ---
                            is_grooming = is_hand_near_face(kpts_flat, h_px)
                            is_scanning = check_head_scanning(kpts_flat, person['scan_hist'])
                           
                            label = "Normal"
                            color = (0, 255, 0)
                           
                            # 1. Fighting
                            if lstm_err > POSE_THRESHOLD and dist_speed > 10.0:
                                label, color = "Pose Anomaly (Fight/Fall)", (0, 0, 255)

                            # 2. Stealing
                            elif steal_prob > STEAL_THRESH and lstm_err > STEALING_MIN_MOTION_ERROR:
                                if not is_grooming:
                                    req_conf = 0.90 if (is_pacing or dist_speed > 10) else STEAL_THRESH
                                    if steal_prob > req_conf:
                                        spd = get_stealing_speed(person['pose_seq'], width, height, h_px)
                                        label, color = f"CRIME: {spd}", (128, 0, 128)

                            # 3. Scanning
                            elif is_scanning:
                                label, color = "Scanning (Suspicious)", (255, 0, 255)

                            # 4. Pacing
                            elif is_pacing:
                                label, color = "Pacing", (0, 165, 255)
                                person['debug_info'] = f"R:{pacing_ratio:.1f}"

                            # 5. Loitering (Still)
                            elif person['stationary_counter'] > STILLNESS_LIMIT:
                                label, color = "Loitering (Still)", (255, 0, 0)
                           
                            # 6. Suspicious / Area Loitering
                            # FIX: Check total_dist. If they moved > 2x height, they are WALKING, so don't call it Swaying.
                            elif len(person['loc_hist']) == HISTORY_LEN:
                                is_low_movement = total_dist < (h_px * 2.0)

                                if box_w < SWAY_BOX and box_h < SWAY_BOX and is_low_movement:
                                    label, color = "Suspicious Behavior", (255, 0, 255)
                                elif box_w < AREA_BOX and box_h < AREA_BOX and is_low_movement:
                                    label, color = "Loitering (Area)", (255, 0, 0)

                            # Alert Management
                            if label != "Normal":
                                if person['alert_start_time'] == 0:
                                    person['alert_start_time'] = now
                                    print(f"⚡ Alert ID {track_id}: {label}")
                                    threading.Thread(target=save_alert_clip, args=(list(frame_buffer), label)).start()
                               
                                elif (now - person['alert_start_time']) > ALERT_MAX_DURATION:
                                    person['last_cooldown_time'] = now
                                    person['alert_start_time'] = 0
                                    person['loc_hist'].clear()
                                    person['scan_hist'].clear()
                                    person['stationary_counter'] = 0
                                    label, color = "Normal", (0, 255, 0)
                            else:
                                person['alert_start_time'] = 0
                           
                            person['current_label'] = label
                            person['current_color'] = color

                    # --- 4. DRAWING ---
                    lbl = person.get('current_label', "Normal")
                    col = person.get('current_color', (0, 255, 0))
                   
                    x1, y1, x2, y2 = map(int, box)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
                    text = f"ID {track_id}: {lbl} {person.get('debug_info', '')}"
                    cv2.putText(frame, text, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2)
                   
                    for i in range(0, len(kpts_flat), 2):
                        xk, yk = int(kpts_flat[i] * width), int(kpts_flat[i+1] * height)
                        cv2.circle(frame, (xk, yk), 2, (0, 255, 0), -1)

        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

# ==========================================
#  6. FLASK ROUTES
# ==========================================
@app.route('/video')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/logs')
def get_logs():
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'r') as f:
            return Response(f.read(), mimetype='application/json')
    return Response("[]", mimetype='application/json')

if __name__ == '__main__':
    print(f"🚀 AI Server running at http://localhost:5000/video")
    app.run(host='0.0.0.0', port=5000, threaded=True)

