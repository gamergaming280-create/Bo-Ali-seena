"""Re-run the database migrations and the security/workflow tests on a throw-away local Postgres.

    pip install pgserver
    python scripts/run_db_tests.py

It never touches Supabase. Run it after every change to supabase/migrations/ or the tests.
"""
import glob, os, subprocess, sys, tempfile
import pgserver

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bin_dir = os.path.join(os.path.dirname(pgserver.__file__), "pginstall", "bin")
srv = pgserver.get_server(tempfile.mkdtemp(prefix="bas-pg-"), cleanup_mode="delete")
uri = srv.get_uri()
psql = lambda *a: subprocess.run([os.path.join(bin_dir, "psql"), uri, "-v", "ON_ERROR_STOP=1", "-q", *a], capture_output=True, text=True)

steps = [os.path.join(root, "supabase/tests/00_local_stub.sql"), *sorted(glob.glob(os.path.join(root, "supabase/migrations/*.sql"))), os.path.join(root, "supabase/tests/01_security_and_workflow.sql")]
for path in steps:
    r = psql("-f", path)
    ok = r.returncode == 0
    print(f"{'ok    ' if ok else 'FAILED'} {os.path.relpath(path, root)}")
    notices = [l.split("NOTICE:  ", 1)[1] for l in r.stderr.splitlines() if "NOTICE:  " in l]
    if path.endswith("01_security_and_workflow.sql"):
        for n in notices:
            if n.startswith(("PASS", "FAIL", "ALL")): print("   ", n)
    if not ok:
        print(r.stderr[-2000:]); sys.exit(1)
