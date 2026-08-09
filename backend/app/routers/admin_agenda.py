"""Bilingual agenda management."""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..defaults import DEFAULT_AGENDA
from ..deps import require_admin
from ..models import AdminUser, AgendaItem, AgendaSection
from ..schemas import AgendaItemCreate, AgendaItemOut, AgendaItemUpdate

router = APIRouter(prefix="/admin/agenda", tags=["admin:agenda"])


@router.get("", response_model=list[AgendaItemOut])
def list_items(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_admin)
) -> list[AgendaItem]:
    """All items, including deactivated ones."""
    return db.query(AgendaItem).order_by(AgendaItem.sort_order, AgendaItem.id).all()


@router.post("", response_model=AgendaItemOut, status_code=201)
def create_item(
    payload: AgendaItemCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> AgendaItem:
    item = AgendaItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _get_or_404(db: Session, item_id: int) -> AgendaItem:
    item = db.get(AgendaItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="That agenda item no longer exists.")
    return item


@router.patch("/{item_id}", response_model=AgendaItemOut)
def update_item(
    item_id: int,
    payload: AgendaItemUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> AgendaItem:
    item = _get_or_404(db, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204, response_model=None)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
) -> None:
    db.delete(_get_or_404(db, item_id))
    db.commit()


@router.post("/reorder", response_model=list[AgendaItemOut])
def reorder(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin),
    ordered_ids: list[int] = Body(..., embed=True),
) -> list[AgendaItem]:
    """Persist a new running order. Positions are spaced by 10 to leave room."""
    items = {item.id: item for item in db.query(AgendaItem).all()}
    for position, item_id in enumerate(ordered_ids, start=1):
        if item_id in items:
            items[item_id].sort_order = position * 10
    db.commit()
    return db.query(AgendaItem).order_by(AgendaItem.sort_order, AgendaItem.id).all()


@router.post("/restore-defaults", response_model=list[AgendaItemOut])
def restore_defaults(
    db: Session = Depends(get_db), _: AdminUser = Depends(require_admin)
) -> list[AgendaItem]:
    """Wipe the agenda and re-seed it from the original programme documents."""
    db.query(AgendaItem).delete()
    for entry in DEFAULT_AGENDA:
        db.add(
            AgendaItem(
                section=AgendaSection(entry["section"]),
                time_label=entry["time_label"],
                summary_en=entry.get("summary_en"),
                summary_rw=entry.get("summary_rw"),
                bullets_en=entry.get("bullets_en", []),
                bullets_rw=entry.get("bullets_rw", []),
                sort_order=entry["sort_order"],
            )
        )
    db.commit()
    return db.query(AgendaItem).order_by(AgendaItem.sort_order, AgendaItem.id).all()
