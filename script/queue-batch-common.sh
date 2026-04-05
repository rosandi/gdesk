#!/bin/bash
#SBATCH --job-name={{jobname}}
#SBATCH -p {{partition}}
#SBATCH -N {{numnode}}
#SBATCH -n {{numproc}}
#SBATCH --ntasks-per-core={{numtask}}
#SBATCH --mail-type=END
#SBATCH --mail-user={{mail}}

export OMP_PROC_BIND=true
export NUMBA_NUM_THREADS=$SLURM_NPROCS
export OMP_NUM_THREADS=$SLURM_NPROCS
export OMPI_MCA_btl_vader_single_copy_mechanism=none
{{command}}
