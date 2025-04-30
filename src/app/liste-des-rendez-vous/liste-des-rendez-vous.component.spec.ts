import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeDesRendezVousComponent } from './liste-des-rendez-vous.component';

describe('ListeDesRendezVousComponent', () => {
  let component: ListeDesRendezVousComponent;
  let fixture: ComponentFixture<ListeDesRendezVousComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListeDesRendezVousComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeDesRendezVousComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
