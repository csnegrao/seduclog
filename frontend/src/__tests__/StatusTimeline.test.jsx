import { render, screen } from '@testing-library/react';
import StatusTimeline, { DELIVERY_STEPS } from '../components/StatusTimeline';

describe('StatusTimeline', () => {
  it('renders all 5 steps', () => {
    render(<StatusTimeline status="approved" />);
    DELIVERY_STEPS.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('marks first step as current when status is approved', () => {
    render(<StatusTimeline status="approved" />);
    const currentStep = document.querySelector('.step--current');
    expect(currentStep).toBeInTheDocument();
    expect(currentStep).toHaveTextContent('Pedido Aprovado');
  });

  it('marks dispatched as current and first two as done', () => {
    render(<StatusTimeline status="dispatched" />);
    const currentStep = document.querySelector('.step--current');
    expect(currentStep).toHaveTextContent('Despachado');
    const doneSteps = document.querySelectorAll('.step--done');
    expect(doneSteps.length).toBe(2);
  });

  it('sets aria-current="step" on the current step', () => {
    render(<StatusTimeline status="arriving" />);
    const arrivingLabel = screen.getByText('Chegando');
    const li = arrivingLabel.closest('li');
    expect(li).toHaveAttribute('aria-current', 'step');
  });

  it('no steps are done when status is approved', () => {
    render(<StatusTimeline status="approved" />);
    const doneSteps = document.querySelectorAll('.step--done');
    expect(doneSteps.length).toBe(0);
  });

  it('all steps are done when status is delivered except last', () => {
    render(<StatusTimeline status="delivered" />);
    const currentStep = document.querySelector('.step--current');
    expect(currentStep).toHaveTextContent('Entregue');
    const doneSteps = document.querySelectorAll('.step--done');
    expect(doneSteps.length).toBe(4);
  });
});
