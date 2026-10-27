from django.contrib.auth import get_user_model
from apps.economy.models import Post, CollabDeal, Battle, profile_for, wallet_for
U=get_user_model()
me=U.objects.get(username="corey"); nova=U.objects.filter(username="nova").first() or U.objects.create_user("nova",email="nova@x.test"); sable=U.objects.filter(username="sable").first() or U.objects.create_user("sable",email="sable@x.test")
w=wallet_for(me); w.spinaz=12400; w.promptz=63; w.energy=940; w.save()
Post.objects.filter(author__in=[me,nova,sable]).delete()
p1=Post.objects.create(author=me,title="Midnight Take",description="Rain on the roof, kept the pocket. Cover art and lyrics attached.",genre="Trap",media_type="audio",media_url="",items=[{"type":"image","url":"/icons/postz.png","title":"Cover"}],skills_used=[])
Post.objects.create(author=nova,title="Second Verse — need a hook",description="Beat's done. Looking for a topline.",genre="R&B")
Post.objects.create(author=sable,title="Cover art for the EP",description="Neon, but warmer than the last one.",genre="Alternative",items=[{"type":"image","url":"/icons/imagez.png","title":"EP cover"}])
CollabDeal.objects.filter(initiator=me).delete(); Battle.objects.filter(host=me).delete()
CollabDeal.objects.create(initiator=me,title="Midnight — topline",currency="spinaz",status="funded",stake_spinaz=50,description="You take the hook, I keep the beat.",source_post=p1,held_spinaz=100,
  participants=[{"username":"corey","user_id":me.id,"worth_cents":6000,"receives_cents":6000,"funded":True},{"username":"nova","user_id":nova.id,"worth_cents":4000,"receives_cents":4000,"funded":True}])
Battle.objects.create(host=me,title="Best 16 bars — Trap",description="One take, no punch-ins.",genre="Trap",entry_spinaz=100,mode="open",kind="1v1")
pr=profile_for(me); pr.personas=[{"key":"main","name":"Independent Artist","skills":[{"name":"any_daw","rate_cents":1200}]}]; pr.save()
print("seeded")
