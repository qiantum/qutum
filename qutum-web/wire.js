//
// Qutum 10 implementation
// Copyright 2008-2010 Qianyan Cai
// Under the terms of the GNU General Public License version 3
// http://qutum.com
//
(function () {

var S = Datum.SPACE / 4, SS = Datum.SPACE / 2

Wire = function ()
{
}
Wire.prototype =
{
edit: null,
base: null,
agent: null,
zone: null,
zb: null,
za: null,
yield: 0, // yield, with error

err: '',
refresh: false,
xys: null, // []
dragMode: 0,
nowPrev: null,
nowNext: null,

addTo: function (b, a)
{
	if (b != a)
	{
		var d = b.deep - a.deep
		var zb = this.base = b, za = this.agent = a
		while (d > 0)
			b = (zb = b).zone, --d
		while (d < 0)
			a = (za = a).zone, ++d
		while (b != a)
			b = (zb = b).zone, a = (za = a).zone
		this.edit = b.edit
		this.zone = b
		b.wires.push(this)
		this.zb = zb, this.za = za
		this.yield || this.compile1() // skip layout if error
	}
	else
		this.zone.wires.push(this)
	this.edit.refresh = this.refresh = true
},

unadd: function ()
{
	this.zone.wires.remove(this) // no zone layout
	var p = this.nowPrev, n = this.nowNext
	this.edit.now == this && (this.edit.now = nowPrev)
	p && (p.nowNext = n), n && (n.nowPrev = p)
	this.nowPrev = this.nowNext = null
},

////////////////////////////////      ////////////////////////////////
//////////////////////////////// view ////////////////////////////////
////////////////////////////////      ////////////////////////////////

layout: function (force)
{
	if ( !this.refresh && !force)
		return
	this.refresh = false
	if (this.zone.detail <= 2)
		return this.xys = null

	var xys = this.xys = [], zone = this.zone, base = this.base, agent = this.agent,
		zb = this.zb, za = this.za, bx, by, b5, bq, ax, ay, aw, a5, aq, x, y, i
	bx = base.offsetX(zone), b5 = bx + base.w / 2
	bq = base.w ? 1 : 0
	if (base != zone)
		by = this.err ? base.offsetY(zone) + base.h - bq : zb.y + zb.h - 1
	x = agent.offsetX(zone), y = agent.offsetY(zone)
	if (this.err || base == zone)
		ax = x, ay = y, aw = agent.w, a5 = ax + aw / 2
	else
		ax = za.x, ay = za.y, aw = za.w, a5 = ax + aw / 2
	aq = agent.w ? 1 : 0
	if (b5 < ax && bx + base.w < a5)
		bx += base.w - bq, aw = 0 // right of base, left of agent
	else if (a5 < bx && ax + aw < b5)
		bx += bq // left of base, right of agent
	else if ((b5 < a5) == (base.w < aw))
		bx += bq, aw = 0 // left of base, left of agent
	else
		bx += base.w - bq // right of base, right of agent
	if (this.err)
		xys.push(ax, ay, bx, base == zone ? ay : by)
	else
	{
		ax = aw ? x - aq : x + aq, ay = y + aq
		xys.push(x = aw ? ax + agent.w : ax, y = ay)
		var azer = agent.azer, a = agent, r
		for (; a != azer; a = a.zone)
			ax -= a.x, ay -= a.y
		while (a != za || base == zone)
		{
			Up: if (a.detail >= 2)
			{
				r = a.row
				Hori: if (a != azer || agent == azer)
					if (aw)
					{
						for (i = r.length - 1; a != r[i]; i--)
							if (r[i].y - a.y <= y - ay)
								break Hori
						break Up
					}
					else
					{
						for (i = 0; a != r[i]; i++)
							if (r[i].y - a.y <= y - ay)
								break Hori
						break Up
					}
				xys.push(x, y = ay - a.y + r.y - S - SS * a.x / r.w)
			}
			if (a == za)
				break // base == zone
			ax -= a.x, ay -= a.y
			a = a.zone
			if (a.detail >= 2)
				x = S + S * (y - ay) / a.h,
				xys.push(x = aw ? ax + a.w + x : ax - x, y)
		}
		if (base == zone)
			by = y
		else if ((r = a.row) == zb.row)
		{
			ax = x
			if (ax == a.x + aq)
				xys.push(ax -= S + S, y)
			if (r[i = r.indexOf(a) - 1] == zb && base == zb)
				xys.push(ax, by)
			else
				xys.push(ax, ay = r.y + r.h + S + SS * bx / r.w, bx, ay)
		}
		else
		{
			ax = x, ay = r.y - S - SS * a.x / zone.w
			xys.push(ax, ay)
			i = zone.rows.indexOf(r)
			while ((r = zone.rows[--i]) != zb.row)
			{
				d = r[r.searchDatumX(ax)]
				if (d && ax > d.x - S && ax < d.x + d.w + S)
					if (ax < d.x + d.w / 2)
						ax = d.x - S - S * ax / zone.w
					else
						ax = d.x + d.w + S + S * ax / zone.w
				xys.push(ax, ay)
				xys.push(ax, ay = r.y - S - SS * ax / zone.w)
			}
			if (ax - bx < -2 || ax - bx > 2)
				xys.push(bx, ay)
		}
		xys.push(bx, by)
	}
},

draw: function (draw)
{
	var s = this.xys
	if ( !s)
		return
	draw.lineWidth = 2
	draw.strokeStyle = this.err ? this.yield ? '#ffbbbb' : '#ff3333' : this.yield ? '#aaaaaa' : '#555555'
	draw.beginPath()
	draw.moveTo(s[0], s[1])
	for (var i = 2, n = s.length; i < n; )
		draw.lineTo(s[i++], s[i++])
	draw.stroke()
},

////////////////////////////////         ////////////////////////////////
//////////////////////////////// compile ////////////////////////////////
////////////////////////////////         ////////////////////////////////

compile1: function ()
{
	this.err != (this.err = this.error1()) && (this.edit.refresh = this.refresh = true)
	this.err && (this.edit.error = 1)
},

error1: function ()
{
	var base = this.base, agent = this.agent 
	if (base.tv > 0 || base.zv)
		return 'base must not be veto or inside'
	if (agent.tv > 0 || agent.zv)
		return 'agent must not be veto or inside'
	var zone = this.zone, az = agent.azer, a, z
	if (base != zone && base.bzer != this.zb)
		return "base or base zoner's zone must be wire zone"
	if (az.deep <= zone.deep)
		return 'agent zoner must be inside wire zone'
	if (base != zone && this.zb.el >= this.za.el)
		return 'must wire early to later'
	if ( !zone.gene)
		if (base != zone && !base.io)
			return 'wire inside agent must have input or output base'
		else if ( !agent.io)
			return 'wire inside agent must have input or output agent'
	for (a = az.zone; a != zone; a = a.zone)
		if (a.io < 0)
			return 'wire must not cross input edge'
	for (a = az.zone; a != zone; a = z, z = z.zone)
		if (z = a.zone, !a.gene && z.gene)
			return 'wire must not cross agent edge from gene'
	return ''
},

}

})()