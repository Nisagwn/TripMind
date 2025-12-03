import matplotlib.pyplot as plt
import math

angles = []
distances = []

# veriler.txt dosyasını oku
with open("veriler.txt", "r") as f:
    for line in f:
        if "," in line:
            angle, dist = line.split(",")
            angles.append(math.radians(float(angle)))
            distances.append(float(dist))

plt.figure(figsize=(8, 8))
ax = plt.subplot(111, projection='polar')

ax.scatter(angles, distances, c='lime', s=10)
ax.set_title("Robot Radar Harita", fontsize=16)

plt.show()
