import os
import subprocess
import platform
from typing import Dict, List
from datetime import datetime

class USBScanner:
    """Scanner pour périphériques USB et détection de menaces"""

    async def scan(self, options: Dict) -> Dict:
        """
        Scan approfondi des périphériques USB avec ClamAV et détections avancées
        Détecte: malwares, autorun, scripts cachés, dumps mémoire infectés, exécutables déguisés
        """
        device = options.get('device')
        if not device:
            return {"status": "error", "message": "Device USB requis"}

        scan_results = []
        infected_files = []
        suspicious_files = []

        try:
            # Monter le device temporairement pour le scan
            mount_point = f"/tmp/usb_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            os.makedirs(mount_point, exist_ok=True)

            # Monter le device
            mount_result = subprocess.run(
                ["mount", device, mount_point],
                capture_output=True,
                text=True,
                timeout=10
            )

            if mount_result.returncode != 0:
                # Essayer de monter la première partition
                mount_result = subprocess.run(
                    ["mount", f"{device}1", mount_point],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

            if mount_result.returncode == 0:
                # 1. Scanner avec ClamAV (détection signature)
                print("[USB SCAN] Étape 1/5: ClamAV signature scan...")
                clam_result = subprocess.run(
                    ["clamscan", "-r", "-i", "--no-summary", mount_point],
                    capture_output=True,
                    text=True,
                    timeout=300
                )

                for line in clam_result.stdout.splitlines():
                    if "FOUND" in line:
                        parts = line.split(":")
                        if len(parts) >= 2:
                            file_path = parts[0].strip()
                            threat = parts[1].replace("FOUND", "").strip()
                            infected_files.append({
                                "file": file_path.replace(mount_point, ""),
                                "threat": threat,
                                "detection": "ClamAV"
                            })

                # 2. Détecter autorun.inf et fichiers auto-exécution Windows
                print("[USB SCAN] Étape 2/5: Autorun/Autoplay detection...")
                autorun_files = ["autorun.inf", "autorun.bat", "desktop.ini"]
                for root, dirs, files in os.walk(mount_point):
                    for file in files:
                        file_lower = file.lower()
                        if file_lower in autorun_files:
                            full_path = os.path.join(root, file)
                            suspicious_files.append({
                                "file": full_path.replace(mount_point, ""),
                                "threat": "Autorun/Autoplay file detected",
                                "detection": "Behavioral"
                            })

                # 3. Détecter fichiers avec double extension (.pdf.exe, .jpg.exe, etc)
                print("[USB SCAN] Étape 3/5: Double extension detection...")
                dangerous_exts = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com", ".vbs", ".ps1"]
                for root, dirs, files in os.walk(mount_point):
                    for file in files:
                        file_lower = file.lower()
                        # Détecter double extension
                        if any(file_lower.endswith(ext) for ext in dangerous_exts):
                            # Vérifier si extension avant (.pdf.exe, .jpg.exe, etc)
                            base = file_lower.rsplit(".", 1)[0] if "." in file_lower else ""
                            if "." in base:
                                full_path = os.path.join(root, file)
                                suspicious_files.append({
                                    "file": full_path.replace(mount_point, ""),
                                    "threat": "Double extension (potential disguise)",
                                    "detection": "Heuristic"
                                })

                # 4. Détecter dumps mémoire suspects (.dmp, .dump, .raw)
                print("[USB SCAN] Étape 4/5: Memory dump analysis...")
                dump_exts = [".dmp", ".dump", ".raw", ".mem", ".vmem"]
                for root, dirs, files in os.walk(mount_point):
                    for file in files:
                        file_lower = file.lower()
                        if any(file_lower.endswith(ext) for ext in dump_exts):
                            full_path = os.path.join(root, file)
                            # Scanner le dump avec ClamAV (peut contenir malware en mémoire)
                            dump_scan = subprocess.run(
                                ["clamscan", "-i", full_path],
                                capture_output=True,
                                text=True,
                                timeout=60
                            )
                            if "FOUND" in dump_scan.stdout:
                                threat = dump_scan.stdout.split(":")[-1].replace("FOUND", "").strip()
                                infected_files.append({
                                    "file": full_path.replace(mount_point, ""),
                                    "threat": f"Malware in memory dump: {threat}",
                                    "detection": "ClamAV (dump)"
                                })
                            else:
                                # Dump suspect même si pas infecté
                                suspicious_files.append({
                                    "file": full_path.replace(mount_point, ""),
                                    "threat": "Memory dump file (requires investigation)",
                                    "detection": "Forensic"
                                })

                # 5. Détecter exécutables déguisés (magic bytes check)
                print("[USB SCAN] Étape 5/5: Magic bytes analysis...")
                for root, dirs, files in os.walk(mount_point):
                    for file in files:
                        file_lower = file.lower()
                        # Fichiers qui ne devraient pas être des exécutables
                        safe_exts = [".txt", ".jpg", ".png", ".gif", ".pdf", ".doc", ".docx"]
                        if any(file_lower.endswith(ext) for ext in safe_exts):
                            full_path = os.path.join(root, file)
                            try:
                                with open(full_path, "rb") as f:
                                    magic = f.read(4)
                                    # Vérifier magic bytes PE (Windows executable)
                                    if magic[:2] == b"MZ":
                                        suspicious_files.append({
                                            "file": full_path.replace(mount_point, ""),
                                            "threat": "Executable disguised as safe file (PE header detected)",
                                            "detection": "Magic bytes"
                                        })
                                    # ELF (Linux executable)
                                    elif magic[:4] == b"\x7fELF":
                                        suspicious_files.append({
                                            "file": full_path.replace(mount_point, ""),
                                            "threat": "Executable disguised as safe file (ELF header detected)",
                                            "detection": "Magic bytes"
                                        })
                            except:
                                pass

                scan_results.append({
                    "scanner": "ClamAV + Heuristic",
                    "infected_files": infected_files + suspicious_files,
                    "clean": len(infected_files) == 0 and len(suspicious_files) == 0
                })

                # Démonter
                subprocess.run(["umount", mount_point], timeout=10)

            # Nettoyer
            try:
                os.rmdir(mount_point)
            except:
                pass

        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "scan_results": []
            }

        return {
            "status": "completed",
            "timestamp": datetime.now().isoformat(),
            "scan_results": scan_results,
            "total_infected": len(infected_files),
            "total_suspicious": len(suspicious_files),
            "devices": [device],
            "block_devices": [device]
        }

    async def _detect_usb_devices(self, issues: List) -> List[Dict]:
        """Détecter les périphériques USB connectés"""
        devices = []

        try:
            system = platform.system()

            if system == "Darwin":  # macOS
                result = subprocess.run(
                    ["system_profiler", "SPUSBDataType", "-json"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    # Analyser la sortie JSON
                    import json
                    data = json.loads(result.stdout)
                    # Extraction simplifiée
                    devices.append({
                        "name": "USB Device",
                        "type": "USB Storage",
                        "status": "connected"
                    })

            elif system == "Linux":
                result = subprocess.run(
                    ["lsusb"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    for line in result.stdout.splitlines():
                        if line.strip():
                            devices.append({
                                "name": line.split("ID")[1].strip() if "ID" in line else line,
                                "type": "USB Device",
                                "status": "connected"
                            })

            # Détecter les périphériques suspects
            suspicious_keywords = ["keylogger", "rubber ducky", "bash bunny", "lan turtle"]
            for device in devices:
                device_name_lower = device["name"].lower()
                for keyword in suspicious_keywords:
                    if keyword in device_name_lower:
                        issues.append({
                            "severity": "critical",
                            "type": "suspicious_usb_device",
                            "description": f"Périphérique USB suspect détecté: {device['name']}",
                            "recommendation": "Déconnecter immédiatement ce périphérique et analyser le système"
                        })

        except Exception as e:
            devices.append({
                "name": "Error detecting devices",
                "type": "error",
                "error": str(e)
            })

        return devices

    async def _analyze_mounted_volumes(self, issues: List) -> List[Dict]:
        """Analyser les volumes montés"""
        volumes = []

        try:
            import psutil
            partitions = psutil.disk_partitions()

            for partition in partitions:
                if "removable" in partition.opts or partition.fstype in ["vfat", "exfat", "ntfs"]:
                    usage = psutil.disk_usage(partition.mountpoint)
                    volume_info = {
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free
                    }
                    volumes.append(volume_info)

                    # Vérifier les fichiers suspects sur le volume
                    suspicious_files = await self._scan_volume_for_threats(partition.mountpoint, issues)

                    if suspicious_files > 0:
                        issues.append({
                            "severity": "high",
                            "type": "suspicious_files_on_usb",
                            "description": f"{suspicious_files} fichiers suspects trouvés sur {partition.mountpoint}",
                            "recommendation": "Analyser le contenu du périphérique USB avec un antivirus"
                        })

        except Exception as e:
            pass

        return volumes

    async def _scan_volume_for_threats(self, mountpoint: str, issues: List) -> int:
        """Scanner un volume USB pour détecter des menaces"""
        suspicious_count = 0

        try:
            suspicious_extensions = [".exe", ".bat", ".cmd", ".ps1", ".vbs", ".scr", ".pif"]

            for root, dirs, files in os.walk(mountpoint):
                # Limiter la profondeur de scan
                if root.count(os.sep) - mountpoint.count(os.sep) > 3:
                    continue

                for file in files[:100]:  # Limiter à 100 fichiers
                    file_lower = file.lower()
                    if any(file_lower.endswith(ext) for ext in suspicious_extensions):
                        suspicious_count += 1

                    # Détecter les fichiers cachés suspects
                    if file.startswith(".") and os.path.getsize(os.path.join(root, file)) > 1000000:
                        suspicious_count += 1

        except:
            pass

        return suspicious_count

    async def _check_usb_history(self, issues: List) -> Dict:
        """Vérifier l'historique des connexions USB"""
        history = {
            "recent_connections": [],
            "total_devices_seen": 0
        }

        try:
            system = platform.system()

            if system == "Darwin":  # macOS
                # Sur macOS, vérifier les logs système
                result = subprocess.run(
                    ["log", "show", "--predicate", "eventMessage contains 'USB'", "--last", "1h"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    lines = result.stdout.splitlines()[:10]
                    history["recent_connections"] = lines

            elif system == "Linux":
                # Sur Linux, vérifier dmesg
                result = subprocess.run(
                    ["dmesg", "|", "grep", "-i", "usb"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    shell=True
                )
                if result.returncode == 0:
                    lines = result.stdout.splitlines()[-10:]
                    history["recent_connections"] = lines

        except:
            pass

        return history
