import os
import subprocess
import platform
import psutil
from typing import Dict, List
from datetime import datetime

class WorkstationScanner:
    """Scanner pour audit de sécurité des stations de travail"""

    async def scan(self, options: Dict) -> Dict:
        """
        Audit complet d'une station de travail
        Détecte: processus suspects, configuration non sécurisée, vulnérabilités système
        """
        issues = []

        # Informations système
        system_info = await self._get_system_info(issues)

        # Processus en cours
        running_processes = await self._check_running_processes(issues)

        # Services actifs
        active_services = await self._check_services(issues)

        # Vérification de sécurité
        security_checks = await self._perform_security_checks(issues)

        # Utilisateurs et permissions
        user_audit = await self._audit_users(issues)

        return {
            "status": "completed",
            "timestamp": datetime.now().isoformat(),
            "system_info": system_info,
            "running_processes": running_processes,
            "active_services": active_services,
            "security_checks": security_checks,
            "user_audit": user_audit,
            "issues": issues,
            "summary": {
                "total_processes": len(running_processes),
                "total_services": len(active_services),
                "critical_issues": len([i for i in issues if i["severity"] == "critical"]),
                "high_issues": len([i for i in issues if i["severity"] == "high"]),
                "medium_issues": len([i for i in issues if i["severity"] == "medium"])
            }
        }

    async def _get_system_info(self, issues: List) -> Dict:
        """Récupérer les informations système"""
        info = {
            "hostname": platform.node(),
            "os": platform.system(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "cpu_count": psutil.cpu_count(),
            "memory_total": psutil.virtual_memory().total,
            "disk_usage": []
        }

        # Vérifier l'utilisation disque
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                info["disk_usage"].append({
                    "mountpoint": partition.mountpoint,
                    "percent": usage.percent
                })

                # Alerte si disque plein
                if usage.percent > 90:
                    issues.append({
                        "severity": "high",
                        "type": "disk_space_critical",
                        "description": f"Espace disque critique sur {partition.mountpoint}: {usage.percent}% utilisé",
                        "recommendation": "Libérer de l'espace disque"
                    })
            except:
                pass

        return info

    async def _check_running_processes(self, issues: List) -> List[Dict]:
        """Vérifier les processus en cours d'exécution"""
        processes = []
        suspicious_processes = [
            "netcat", "nc", "nmap", "wireshark", "tcpdump", "metasploit",
            "mimikatz", "psexec", "powershell", "cmd"
        ]

        # Processus Apple/macOS légitimes à ignorer
        macos_legit_processes = [
            "launchd", "kernel_task", "loginwindow", "SystemUIServer",
            "Finder", "Dock", "WindowServer", "syslogd", "configd",
            "notifyd", "diskarbitrationd", "bluetoothd", "blued",
            "ContinuityCaptureAgent", "NotificationCenter", "UserNotificationCenter",
            "SiriNCService", "Safari", "imklaunchagent", "avconferenced",
            "exchangesyncd", "CMFSyncAgent", "SafariBookmarksSyncAgent",
            "CallHistorySyncHelper", "AdobeResourceSynchronizer",
            "intelligenceplatformd", "intelligencecontextd", "siriinferenced",
            "callintelligenced", "generativeexperiencesd", "HostInferencePro",
            "IntelligencePlatformComputeService", "transparencyd", "swtransparencyd",
            "ProtectedCloudKeySyncing", "IMDPersistenceAgent", "financed",
            "SafariLaunchAgent", "mapssyncd", "postersyncd", "syncdefaultsd",
            "appplaceholdersyncd", "mmaintenanced", "audioclocksyncd",
            "SimLaunchHost", "AquaAppearanceHelper", "powerexperienced",
            "colorsync", "colorsyncd", "launchservicesd", "ColorSyncXPCAgent"
        ]

        # Signatures de processus ransomware
        ransomware_processes = [
            "wannacry", "wcry", "wncry", "locky", "cerber", "cryptolocker",
            "teslacrypt", "petya", "mischa", "goldeneye", "jigsaw",
            "samsam", "ryuk", "maze", "revil", "sodinokibi", "conti",
            "darkside", "babuk", "avaddon", "ragnarok", "egregor"
        ]

        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
            try:
                proc_info = proc.info
                processes.append({
                    "pid": proc_info['pid'],
                    "name": proc_info['name'],
                    "username": proc_info['username'],
                    "cpu_percent": proc_info['cpu_percent'],
                    "memory_percent": proc_info['memory_percent']
                })

                # Vérifier si c'est un processus légitime Apple/macOS
                proc_name_lower = proc_info['name'].lower()
                is_legit_macos = any(legit.lower() in proc_name_lower for legit in macos_legit_processes)

                # Vérifier si c'est un processus système connu
                is_system_proc = (
                    proc_info['username'] == 'root' or
                    proc_name_lower.startswith(('system', 'com.apple', 'kernel')) or
                    proc_name_lower.endswith('d')  # Daemons Unix
                )

                # Détecter UNIQUEMENT les ransomwares connus (pas les processus suspects génériques)
                if not is_legit_macos and not is_system_proc:
                    for ransom_proc in ransomware_processes:
                        # Match exact uniquement (pas de substring)
                        if ransom_proc == proc_name_lower or proc_name_lower.startswith(ransom_proc + '.'):
                            issues.append({
                                "severity": "critical",
                                "type": "ransomware_process_detected",
                                "description": f"🚨 PROCESSUS RANSOMWARE ACTIF: {proc_info['name']} (PID: {proc_info['pid']})",
                                "recommendation": f"URGENCE: Tuer le processus immédiatement: kill -9 {proc_info['pid']}, puis déconnecter du réseau"
                            })

                    # Détecter les processus suspects (sauf si légitime ou système)
                    for susp_proc in suspicious_processes:
                        if susp_proc in proc_name_lower and susp_proc == proc_name_lower:
                            issues.append({
                                "severity": "high",
                                "type": "suspicious_process",
                                "description": f"Processus suspect détecté: {proc_info['name']} (PID: {proc_info['pid']})",
                                "recommendation": f"Vérifier la légitimité du processus {proc_info['name']}"
                            })

                # Détecter les processus gourmands
                if proc_info['cpu_percent'] and proc_info['cpu_percent'] > 80:
                    issues.append({
                        "severity": "medium",
                        "type": "high_cpu_usage",
                        "description": f"Processus utilisant beaucoup de CPU: {proc_info['name']} ({proc_info['cpu_percent']}%)",
                        "recommendation": "Vérifier si ce processus est nécessaire"
                    })

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        return processes[:50]  # Limiter à 50 processus

    async def _check_services(self, issues: List) -> List[Dict]:
        """Vérifier les services actifs"""
        services = []

        try:
            system = platform.system()

            if system == "Darwin":  # macOS
                result = subprocess.run(
                    ["launchctl", "list"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    lines = result.stdout.splitlines()[1:]  # Skip header
                    for line in lines[:30]:  # Limiter à 30 services
                        parts = line.split()
                        if len(parts) >= 3:
                            services.append({
                                "name": parts[2],
                                "status": "running" if parts[0] != "-" else "stopped"
                            })

            elif system == "Linux":
                result = subprocess.run(
                    ["systemctl", "list-units", "--type=service", "--state=running"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    lines = result.stdout.splitlines()[1:]
                    for line in lines[:30]:
                        parts = line.split()
                        if parts:
                            services.append({
                                "name": parts[0],
                                "status": "running"
                            })

        except:
            pass

        return services

    async def _perform_security_checks(self, issues: List) -> Dict:
        """Effectuer des vérifications de sécurité"""
        checks = {
            "firewall_enabled": False,
            "antivirus_running": False,
            "updates_available": False,
            "password_policy": "unknown"
        }

        try:
            system = platform.system()

            # Vérifier le firewall
            if system == "Darwin":
                result = subprocess.run(
                    ["sudo", "-n", "pfctl", "-s", "info"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                checks["firewall_enabled"] = result.returncode == 0

            elif system == "Linux":
                result = subprocess.run(
                    ["systemctl", "is-active", "firewalld"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                checks["firewall_enabled"] = "active" in result.stdout

            # Alerte si firewall désactivé
            if not checks["firewall_enabled"]:
                issues.append({
                    "severity": "critical",
                    "type": "firewall_disabled",
                    "description": "Le firewall n'est pas activé",
                    "recommendation": "Activer le firewall système immédiatement"
                })

        except:
            pass

        return checks

    async def _audit_users(self, issues: List) -> Dict:
        """Auditer les utilisateurs et permissions"""
        audit = {
            "current_user": os.getenv("USER", "unknown"),
            "users": [],
            "sudo_users": []
        }

        try:
            system = platform.system()

            if system in ["Darwin", "Linux"]:
                # Lire /etc/passwd pour les utilisateurs
                if os.path.exists("/etc/passwd"):
                    with open("/etc/passwd", "r") as f:
                        for line in f:
                            parts = line.split(":")
                            if len(parts) >= 3 and int(parts[2]) >= 1000:  # UID >= 1000 = utilisateurs normaux
                                audit["users"].append({
                                    "username": parts[0],
                                    "uid": parts[2]
                                })

                # Vérifier les utilisateurs sudo
                if os.path.exists("/etc/sudoers"):
                    result = subprocess.run(
                        ["sudo", "-n", "grep", "-v", "^#", "/etc/sudoers"],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        for line in result.stdout.splitlines():
                            if line.strip():
                                audit["sudo_users"].append(line.strip())

            # Alerte si trop d'utilisateurs avec privilèges
            if len(audit["sudo_users"]) > 3:
                issues.append({
                    "severity": "medium",
                    "type": "excessive_sudo_users",
                    "description": f"{len(audit['sudo_users'])} utilisateurs ont des privilèges sudo",
                    "recommendation": "Limiter le nombre d'utilisateurs avec privilèges administrateur"
                })

        except:
            pass

        return audit
